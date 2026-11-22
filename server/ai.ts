import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Response } from "express";
import { z } from "zod";
import * as P from "./prompts.ts";
import { communityLinks, findBookPages, freeAvailable, freeDeck, freeDefine, freeLesson, freePlacement, wikiText } from "./free.ts";
import { checkOllama, ollamaJson, ollamaStream, type OllamaMessage } from "./ollama.ts";

export const MODEL = process.env.LISAN_MODEL || "claude-opus-5-5";
// Güvenlik sınıflandırıcısı bir isteği reddederse sunucu tarafında otomatik yedek model devreye girer.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type Engine = "claude" | "ollama" | "free";

/** İstenen kaynağa göre kullanılacak motoru seçer: Claude → Ollama (ücretsiz, yerel) → ücretsiz veri motoru. */
export async function resolveEngine(pref?: string): Promise<Engine> {
  if (pref === "free") return "free";
  const ollama = (await checkOllama()).available;
  if (pref === "ollama" && ollama) return "ollama";
  if (pref === "claude" && aiAvailable()) return "claude";
  if (aiAvailable()) return "claude";
  if (ollama) return "ollama";
  return "free";
}

export const NEEDS_LLM =
  "Bu özellik bir dil modeli gerektirir. Ücretsiz seçenek: bilgisayarına Ollama kur (ollama.com) ve “ollama pull qwen3:8b” çalıştır; Lisan onu otomatik bulur. Alternatif: sunucuya Claude API anahtarı ekle.";

const isEnglish = (l?: string) => !l || /^english/i.test(l);
const isTurkish = (l?: string) => !l || /^türkçe|^turkish/i.test(l);

// ---------- Akış (SSE) görevleri ----------

export interface StreamRequest {
  task: "tutor" | "story" | "summary" | "analysis" | "explain";
  targetLang?: string; // öğrenilen dil (ör. "English")
  nativeLang?: string; // açıklama dili (ör. "Türkçe")
  level?: string; // CEFR
  messages?: { role: "user" | "assistant"; content: string }[];
  topic?: string;
  title?: string;
  author?: string;
  mode?: string;
  focus?: string[];
  text?: string;
  provider?: string;
}

const LIMIT = 180_000; // tek istekte gönderilecek azami karakter (≈45K token)

function clip(s: string | undefined, max = LIMIT): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function buildStream(req: StreamRequest): {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools?: Anthropic.Beta.BetaToolUnion[];
  effort: Effort;
} {
  const native = req.nativeLang || "Türkçe";
  switch (req.task) {
    case "tutor": {
      const history = (req.messages || []).slice(-30);
      if (!history.length || history[0].role !== "user") throw new Error("Sohbet geçmişi kullanıcı mesajıyla başlamalı");
      const ctx = `[Learner profile] Target language: ${req.targetLang}. Native language: ${native}. CEFR level: ${req.level}. Mode: ${req.mode || "free conversation"}${req.topic ? `. Topic: ${req.topic}` : ""}.`;
      return {
        system: P.TUTOR_SYSTEM,
        messages: history.map((m, i) =>
          i === 0 ? { role: m.role, content: `${ctx}\n\n${m.content}` } : { role: m.role, content: m.content },
        ),
        effort: "low",
      };
    }
    case "story":
      return {
        system: P.STORY_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Write a graded story in ${req.targetLang} at CEFR level ${req.level}. Length: ${req.mode || "medium (~400 words)"}. Topic/genre: ${req.topic || "surprise me"}.`,
          },
        ],
        effort: "low",
      };
    case "summary": {
      const modes: Record<string, string> = {
        kisa: "a 5-minute listenable summary of the whole book",
        detayli: "a detailed chapter-by-chapter (or part-by-part) summary",
        karakterler: "a guide to the main characters, their arcs and relationships",
        fikirler: "the key ideas and lessons of the book, with concrete examples from it",
      };
      const body = req.text
        ? `Summarize the following text (${req.title || "untitled"}).\n\n<text>\n${clip(req.text)}\n</text>`
        : `Book: "${req.title}"${req.author ? ` by ${req.author}` : ""}.`;
      return {
        system: P.SUMMARY_SYSTEM,
        messages: [{ role: "user", content: `${body}\n\nWrite ${modes[req.mode || "kisa"] || modes.kisa}. Language: ${native}.` }],
        effort: "medium",
      };
    }
    case "analysis": {
      const focus = req.focus?.length ? req.focus.join(", ") : "symbolism, themes, subtext, motifs";
      return {
        system: P.ANALYSIS_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Analyze "${req.title}"${req.author ? ` by ${req.author}` : ""}. Focus on: ${focus}.${
              req.text ? `\n\nPassage from the book to anchor the analysis:\n<passage>\n${clip(req.text, 40_000)}\n</passage>` : ""
            }\n\nWrite the analysis in ${native}.`,
          },
        ],
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 8 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
        ],
        effort: "high",
      };
    }
    case "explain":
      return {
        system: P.EXPLAIN_SYSTEM,
        messages: [
          {
            role: "user",
            content: `${req.title ? `Document: ${req.title}\n` : ""}${req.mode ? `Request: ${req.mode}\n` : ""}<passage>\n${clip(req.text)}\n</passage>\n\nExplain this passage in ${native}.`,
          },
        ],
        effort: "medium",
      };
  }
}

function sse(res: Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function streamTask(req: StreamRequest, res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let aborted = false;
  res.on("close", () => (aborted = true));

  try {
    const engine = await resolveEngine(req.provider);
    if (engine === "free") {
      if ((req.task === "summary" || req.task === "analysis") && req.title && !req.text?.trim().length) {
        sse(res, { type: "status", text: "Wikipedia'dan derleniyor…" });
        const r = await wikiText(req.task, req.title, req.author);
        for (const src of r.sources) sse(res, { type: "source", ...src });
        // Okuma hissi için paragraf paragraf gönder
        for (const part of r.text.split(/(?<=\n\n)/)) {
          if (aborted) break;
          sse(res, { type: "text", text: part });
        }
        sse(res, { type: "done" });
        return;
      }
      throw new Error(req.task === "summary" ? `Kendi metnini özetlemek için dil modeli gerekir. ${NEEDS_LLM}` : NEEDS_LLM);
    }
    const { system, messages, tools, effort } = buildStream(req);
    if (engine === "ollama") {
      const om: OllamaMessage[] = [{ role: "system", content: system }];
      let extra = "";
      if (req.task === "analysis" && req.title) {
        // Web araması yerine: Wikipedia sayfalarını bağlam olarak ver
        sse(res, { type: "status", text: "Wikipedia'dan kaynak toplanıyor…" });
        const pages = await findBookPages(req.title, req.author).catch(() => []);
        for (const pg of pages) sse(res, { type: "source", url: pg.url, title: `Wikipedia (${pg.lang.toUpperCase()}): ${pg.title}` });
        for (const l of communityLinks(req.title, req.author)) sse(res, { type: "source", ...l });
        extra = pages
          .map((pg) => `<source url="${pg.url}">\n${pg.sections.map((x) => (x.heading ? `## ${x.heading}\n` : "") + x.text).join("\n").slice(0, 12000)}\n</source>`)
          .join("\n");
        if (extra) extra = `\n\nReference material (cite it; if it is missing something, say what is uncertain):\n${extra}`;
      }
      messages.forEach((m, i) => {
        const text = typeof m.content === "string" ? m.content : "";
        om.push({ role: m.role, content: i === messages.length - 1 ? text + extra : text });
      });
      sse(res, { type: "status", text: "Yerel model yazıyor…" });
      const ctrl = new AbortController();
      res.on("close", () => ctrl.abort());
      await ollamaStream(om, (t) => sse(res, { type: "text", text: t }), ctrl.signal);
      sse(res, { type: "done" });
      return;
    }
    const convo = [...messages];
    const seen = new Set<string>();

    // Web araması uzun sürerse API "pause_turn" ile döner; aynı turu devam ettiririz.
    for (let round = 0; round < 4 && !aborted; round++) {
      const stream = getClient().beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        output_config: { effort },
        messages: convo,
        ...(tools ? { tools } : {}),
      });

      for await (const ev of stream) {
        if (aborted) {
          stream.abort();
          break;
        }
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          sse(res, { type: "text", text: ev.delta.text });
        } else if (ev.type === "content_block_start") {
          const b = ev.content_block;
          if (b.type === "server_tool_use") {
            sse(res, { type: "status", text: b.name === "web_fetch" ? "Kaynak okunuyor…" : "Web'de araştırılıyor…" });
          } else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
            for (const r of b.content) {
              if (!seen.has(r.url)) {
                seen.add(r.url);
                sse(res, { type: "source", url: r.url, title: r.title });
              }
            }
          }
        }
      }
      if (aborted) break;
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        sse(res, { type: "error", text: "Model bu isteği yanıtlamayı reddetti." });
        break;
      }
      if (final.stop_reason === "pause_turn") {
        convo.push({ role: "assistant", content: final.content });
        continue;
      }
      if (final.stop_reason === "max_tokens") sse(res, { type: "status", text: "Yanıt uzunluk sınırına ulaştı." });
      break;
    }
    sse(res, { type: "done" });
  } catch (err) {
    sse(res, { type: "error", text: describeError(err) });
  } finally {
    res.end();
  }
}

export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "API anahtarı geçersiz. Sunucudaki ANTHROPIC_API_KEY değerini kontrol edin.";
  if (err instanceof Anthropic.RateLimitError) return "Hız sınırına ulaşıldı, biraz sonra tekrar deneyin.";
  if (err instanceof Anthropic.BadRequestError) return `İstek hatası: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `API hatası (${err.status}): ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

// ---------- Yapılandırılmış (JSON) görevler ----------

const Lesson = z.object({
  title: z.string(),
  goal: z.string().describe("What the learner can do after this lesson, in native language"),
  explanation: z.string().describe("Grammar/usage explanation in native language with target-language examples"),
  vocab: z.array(
    z.object({ word: z.string(), reading: z.string(), translation: z.string(), example: z.string(), exampleTranslation: z.string() }),
  ),
  dialogue: z.array(z.object({ speaker: z.string(), line: z.string(), translation: z.string() })),
  exercises: z.array(
    z.object({
      kind: z.enum(["mcq", "fill", "translate"]),
      prompt: z.string(),
      options: z.array(z.string()).describe("4 options for mcq, empty otherwise"),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  shadowing: z.array(z.string()).describe("5 natural sentences in the target language for listen-and-repeat practice"),
});

const Deck = z.object({
  cards: z.array(
    z.object({ word: z.string(), reading: z.string(), translation: z.string(), example: z.string(), exampleTranslation: z.string() }),
  ),
});

const Define = z.object({
  lemma: z.string(),
  partOfSpeech: z.string(),
  meaning: z.string(),
  pronunciation: z.string(),
  example: z.string(),
});

const Placement = z.object({
  questions: z.array(
    z.object({ level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]), question: z.string(), options: z.array(z.string()), answer: z.number().int() }),
  ),
});

const Podcast = z.object({
  title: z.string(),
  turns: z.array(z.object({ speaker: z.enum(["A", "B"]), text: z.string() })),
});

const Translate = z.object({ translation: z.string() });

export interface JsonRequest {
  task: "lesson" | "deck" | "define" | "placement" | "podcast" | "translate";
  targetLang?: string;
  nativeLang?: string;
  level?: string;
  topic?: string;
  count?: number;
  exclude?: string[];
  word?: string;
  context?: string;
  text?: string;
  title?: string;
  /** Kurs odağı (ör. günlük konuşma, ana dil gibi konuşma) */
  courseFocus?: string;
  /** Ücretsiz ders motoru için ünite anahtarı ("A1:0", "course:native:3") */
  unitKey?: string;
  provider?: string;
}

function freeJson(req: JsonRequest): unknown {
  if (!freeAvailable()) throw new Error(`Ücretsiz veri dosyaları bulunamadı (data/). ${NEEDS_LLM}`);
  const enTr = isEnglish(req.targetLang) && isTurkish(req.nativeLang);
  const onlyEn = "Ücretsiz (yapay zekâsız) içerik şimdilik İngilizce ↔ Türkçe içindir. Diğer diller için ücretsiz Ollama kurabilirsiniz (Ayarlar → Asistan ve yapay zekâ).";
  switch (req.task) {
    case "lesson":
      if (!enTr) throw new Error(onlyEn);
      if (!req.unitKey) throw new Error("Ünite bilgisi eksik.");
      return freeLesson(req.unitKey, req.level || "A1", req.topic || "");
    case "deck":
      if (!enTr) throw new Error(onlyEn);
      return freeDeck(req.level || "A1", Math.min(req.count || 20, 40), req.exclude || [], req.topic);
    case "define":
      if (!isTurkish(req.nativeLang) || (req.targetLang && !isEnglish(req.targetLang))) throw new Error(onlyEn);
      return freeDefine(req.word || "");
    case "placement":
      if (!enTr) throw new Error(onlyEn);
      return freePlacement();
    default:
      throw new Error(NEEDS_LLM);
  }
}

export async function jsonTask(req: JsonRequest): Promise<unknown> {
  const engine = await resolveEngine(req.provider);
  if (engine === "free") return freeJson(req);
  const native = req.nativeLang || "Türkçe";
  let system: string;
  let content: string;
  let schema: z.ZodType;
  let effort: Effort = "low";

  switch (req.task) {
    case "lesson":
      system = P.LESSON_SYSTEM;
      content = `Create a lesson. Target language: ${req.targetLang}. Native language: ${native}. CEFR level: ${req.level}. Unit: ${req.topic}.${
        req.courseFocus ? ` Course focus: ${clip(req.courseFocus, 1000)}` : ""
      } Include 10-14 vocabulary items, a 8-12 line dialogue, 8 exercises (mix of kinds) and 5 shadowing sentences.`;
      schema = Lesson;
      effort = "medium";
      break;
    case "deck":
      system = P.DECK_SYSTEM;
      content = `Target language: ${req.targetLang}. Native language: ${native}. CEFR level: ${req.level}. ${req.topic ? `Theme: ${req.topic}. ` : ""}Give the next ${Math.min(req.count || 20, 40)} most useful words/chunks for this level.${
        req.exclude?.length ? ` The learner already knows these, do not repeat them: ${req.exclude.slice(-400).join(", ")}` : ""
      }`;
      schema = Deck;
      break;
    case "define":
      system = P.DEFINE_SYSTEM;
      content = `Word: "${req.word}". Language of the word: ${req.targetLang || "detect it"}. Sentence context: "${clip(req.context, 600)}". Learner's native language: ${native}.`;
      schema = Define;
      break;
    case "translate":
      system = "You are a precise literary translator. Translate faithfully and naturally.";
      content = `Translate into ${native}:\n\n${clip(req.text, 8000)}`;
      schema = Translate;
      break;
    case "placement":
      system = P.PLACEMENT_SYSTEM;
      content = `Target language: ${req.targetLang}. Write the questions in the target language, with instructions in ${native}. Create 18 questions: 3 per level A1, A2, B1, B2, C1, C2, ordered from easiest to hardest. "answer" is the 0-based index of the correct option.`;
      schema = Placement;
      effort = "medium";
      break;
    case "podcast":
      system = P.PODCAST_SYSTEM;
      content = `${req.title ? `Source: ${req.title}\n` : ""}Write the episode in ${native}, 14-24 turns.\n\n<text>\n${clip(req.text, 60_000)}\n</text>`;
      schema = Podcast;
      effort = "medium";
      break;
  }

  if (engine === "ollama") {
    try {
      return await ollamaJson(system, content, schema);
    } catch (err) {
      // Otomatik modda Ollama başarısız olursa (ör. bulut kredisi yok) ücretsiz motoru dene
      if (req.provider === "ollama") throw err;
      try {
        return freeJson(req);
      } catch {
        throw err;
      }
    }
  }
  const format = betaZodOutputFormat(schema);
  const msg = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: { effort, format },
    messages: [{ role: "user", content }],
  });
  if (msg.stop_reason === "refusal") throw new Error("Model bu isteği yanıtlamayı reddetti.");
  if (!msg.parsed_output) throw new Error("Model geçerli bir yanıt üretmedi, tekrar deneyin.");
  return msg.parsed_output;
}
