// Ollama: bilgisayarda yerel çalışan, ücretsiz açık kaynak modeller (https://ollama.com).
import type { z } from "zod";
import { toJSONSchema } from "zod";

// Ollama Cloud: OLLAMA_API_KEY verilirse varsayılan adres ollama.com olur (bilgisayara kurulum gerekmez).
export const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
export const OLLAMA_CLOUD = Boolean(OLLAMA_API_KEY) && !process.env.OLLAMA_URL;
export const OLLAMA_URL = (process.env.OLLAMA_URL || (OLLAMA_API_KEY ? "https://ollama.com" : "http://localhost:11434")).replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || (OLLAMA_CLOUD ? "gpt-oss:120b" : "qwen3:8b");

/** İstek başlıkları (bulut için anahtar) */
export function ollamaHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...(OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {}) };
}

/** Yerel modellerde düşünmeyi kapat (hız); bulut modellerinde (gpt-oss) alan gönderilmez. */
export function thinkParam(): Record<string, unknown> {
  return OLLAMA_CLOUD ? {} : { think: false };
}

let state = { available: false, checkedAt: 0, models: [] as string[] };
// Bulut hesabında kredi yoksa bir süre Ollama'yı atla (otomatik modda ücretsiz motora düşülür)
let blockedUntil = 0;
export let ollamaBlockReason = "";

export async function checkOllama(): Promise<typeof state> {
  if (Date.now() < blockedUntil) return { ...state, available: false };
  if (Date.now() - state.checkedAt < 30_000) return state;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { headers: ollamaHeaders(), signal: AbortSignal.timeout(OLLAMA_CLOUD ? 8000 : 1500) });
    const data = (await r.json()) as { models?: { name: string }[] };
    state = { available: r.ok, checkedAt: Date.now(), models: (data.models || []).map((m) => m.name) };
  } catch {
    state = { available: false, checkedAt: Date.now(), models: [] };
  }
  return state;
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
  tool_name?: string;
}

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: ollamaHeaders(),
    body: JSON.stringify({ model: OLLAMA_MODEL, ...thinkParam(), ...body }),
    signal: signal ?? AbortSignal.timeout(300_000),
  });
  if (!r.ok) {
    const t = (await r.text()).slice(0, 200);
    if (/usage credits|subscribe/i.test(t)) {
      blockedUntil = Date.now() + 10 * 60_000;
      ollamaBlockReason = "Ollama Cloud hesabında kredi/abonelik yok";
      throw new Error("Ollama Cloud bu model için kredi ya da abonelik istiyor (ollama.com/plans). Ücretsiz seçenek: Ollama'yı bilgisayarına kurup yerel model kullanmak.");
    }
    throw new Error(
      r.status === 401 || r.status === 403
        ? "Ollama Cloud anahtarı geçersiz (OLLAMA_API_KEY)."
        : `Ollama hatası (${r.status}): ${t}. ${OLLAMA_CLOUD ? `Model adı doğru mu? (OLLAMA_MODEL=${OLLAMA_MODEL})` : `Modeli indirdiniz mi? → ollama pull ${OLLAMA_MODEL}`}`,
    );
  }
  return r;
}

/** Akışlı sohbet: her metin parçası için onText çağrılır. */
export async function ollamaStream(messages: OllamaMessage[], onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const r = await post({ messages, stream: true }, signal);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  let inThink = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (ev.error) throw new Error(`Ollama: ${ev.error}`);
      let t = ev.message?.content || "";
      // Düşünme etiketlerini (bazı modeller üretir) gösterme
      if (t.includes("<think>")) inThink = true;
      if (inThink) {
        if (t.includes("</think>")) {
          inThink = false;
          t = t.slice(t.indexOf("</think>") + 8);
        } else continue;
      }
      if (t) {
        full += t;
        onText(t);
      }
    }
  }
  return full;
}

/** Şemaya uygun JSON üretir ve doğrular. */
export async function ollamaJson<T>(system: string, content: string, schema: z.ZodType<T>): Promise<T> {
  const format = toJSONSchema(schema);
  const r = await post({
    stream: false,
    format,
    options: { temperature: 0.4 },
    messages: [
      { role: "system", content: `${system}\nRespond ONLY with JSON that matches the given schema.` },
      { role: "user", content },
    ],
  });
  const data = (await r.json()) as { message?: { content?: string } };
  const raw = (data.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Yerel model geçerli JSON üretmedi, tekrar deneyin (daha büyük bir model daha iyi sonuç verir).");
  }
  const res = schema.safeParse(parsed);
  if (!res.success) throw new Error("Yerel modelin yanıtı beklenen biçimde değil, tekrar deneyin.");
  return res.data;
}
