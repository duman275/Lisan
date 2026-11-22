import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Response } from "express";
import { z } from "zod";
import * as P from "./prompts.ts";

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
    const { system, messages, tools, effort } = buildStream(req);
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
}

export async function jsonTask(req: JsonRequest): Promise<unknown> {
  const native = req.nativeLang || "Türkçe";
  let system: string;
  let content: string;
  let format: ReturnType<typeof betaZodOutputFormat>;
  let effort: Effort = "low";

  switch (req.task) {
    case "lesson":
      system = P.LESSON_SYSTEM;
      content = `Create a lesson. Target language: ${req.targetLang}. Native language: ${native}. CEFR level: ${req.level}. Unit: ${req.topic}.${
        req.courseFocus ? ` Course focus: ${clip(req.courseFocus, 1000)}` : ""
      } Include 10-14 vocabulary items, a 8-12 line dialogue, 8 exercises (mix of kinds) and 5 shadowing sentences.`;
      format = betaZodOutputFormat(Lesson);
      effort = "medium";
      break;
    case "deck":
      system = P.DECK_SYSTEM;
      content = `Target language: ${req.targetLang}. Native language: ${native}. CEFR level: ${req.level}. ${req.topic ? `Theme: ${req.topic}. ` : ""}Give the next ${Math.min(req.count || 20, 40)} most useful words/chunks for this level.${
        req.exclude?.length ? ` The learner already knows these, do not repeat them: ${req.exclude.slice(-400).join(", ")}` : ""
      }`;
      format = betaZodOutputFormat(Deck);
      break;
    case "define":
      system = P.DEFINE_SYSTEM;
      content = `Word: "${req.word}". Language of the word: ${req.targetLang || "detect it"}. Sentence context: "${clip(req.context, 600)}". Learner's native language: ${native}.`;
      format = betaZodOutputFormat(Define);
      break;
    case "translate":
      system = "You are a precise literary translator. Translate faithfully and naturally.";
      content = `Translate into ${native}:\n\n${clip(req.text, 8000)}`;
      format = betaZodOutputFormat(Translate);
      break;
    case "placement":
      system = P.PLACEMENT_SYSTEM;
      content = `Target language: ${req.targetLang}. Write the questions in the target language, with instructions in ${native}. Create 18 questions: 3 per level A1, A2, B1, B2, C1, C2, ordered from easiest to hardest. "answer" is the 0-based index of the correct option.`;
      format = betaZodOutputFormat(Placement);
      effort = "medium";
      break;
    case "podcast":
      system = P.PODCAST_SYSTEM;
      content = `${req.title ? `Source: ${req.title}\n` : ""}Write the episode in ${native}, 14-24 turns.\n\n<text>\n${clip(req.text, 60_000)}\n</text>`;
      format = betaZodOutputFormat(Podcast);
      effort = "medium";
      break;
  }

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
