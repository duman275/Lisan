import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Response } from "express";
import { z } from "zod";
import { buildJsonPrompt, buildStreamPrompt, type Effort, type JsonRequest, type StreamRequest } from "../shared/tasks.ts";
export type { JsonRequest, StreamRequest };
import { communityLinks, researchPages, withDeadline, freeAvailable, freeJsonTask, NEEDS_LLM, wikiText } from "./free.ts";
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


// ---------- Akış (SSE) görevleri ----------

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
        const r = await wikiText(req.task, req.title, req.author, req.topic, req.sourceHints);
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
    const { system, messages: plain, webResearch, effort } = buildStreamPrompt(req);
    const messages: Anthropic.Beta.BetaMessageParam[] = plain;
    const tools: Anthropic.Beta.BetaToolUnion[] | undefined = webResearch
      ? [
          { type: "web_search_20260209", name: "web_search", max_uses: 8 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
        ]
      : undefined;
    if (engine === "ollama") {
      const om: OllamaMessage[] = [{ role: "system", content: system }];
      let extra = "";
      if (req.task === "analysis" && req.title) {
        // Web araması yerine: Wikipedia sayfalarını bağlam olarak ver
        sse(res, { type: "status", text: "Wikipedia'dan kaynak toplanıyor…" });
        const pages = await withDeadline(researchPages(req.title, req.author, req.topic, req.sourceHints), 10_000, []);
        for (const pg of pages) sse(res, { type: "source", url: pg.url, title: `${pg.lang.length === 2 ? `Wikipedia (${pg.lang.toUpperCase()})` : pg.lang}: ${pg.title}` });
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

function freeJson(req: JsonRequest): unknown {
  if (!freeAvailable()) throw new Error(`Ücretsiz veri dosyaları bulunamadı (data/). ${NEEDS_LLM}`);
  return freeJsonTask(req);
}

export async function jsonTask(req: JsonRequest): Promise<unknown> {
  const engine = await resolveEngine(req.provider);
  if (engine === "free") return freeJson(req);
  const { system, content, schema, effort } = buildJsonPrompt(req);
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
