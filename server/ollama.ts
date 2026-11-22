// Ollama: bilgisayarda yerel çalışan, ücretsiz açık kaynak modeller (https://ollama.com).
import type { z } from "zod";
import { toJSONSchema } from "zod";

export const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

let state = { available: false, checkedAt: 0, models: [] as string[] };

export async function checkOllama(): Promise<typeof state> {
  if (Date.now() - state.checkedAt < 30_000) return state;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, think: false, ...body }),
    signal: signal ?? AbortSignal.timeout(300_000),
  });
  if (!r.ok) {
    const t = (await r.text()).slice(0, 200);
    throw new Error(`Ollama hatası (${r.status}): ${t}. Modeli indirdiniz mi? → ollama pull ${OLLAMA_MODEL}`);
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
