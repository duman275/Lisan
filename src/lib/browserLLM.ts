// Telefonda (sunucusuz sürümde) yapay zekâ: tarayıcı doğrudan OpenAI uyumlu bir servise bağlanır.
// Ücretsiz katmanı olan servisler: Google Gemini (AI Studio), Groq, OpenRouter (":free" modeller).
// Anahtar yalnızca bu cihazda (localStorage) tutulur.
import { toJSONSchema, type z } from "zod";
import { AGENT_SYSTEM, TOOLS } from "../../shared/agentDef";
import { getSettings } from "./store";

export interface LlmPreset {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  keyUrl: string;
  note: string;
}

export const LLM_PRESETS: LlmPreset[] = [
  {
    id: "gemini",
    name: "Google Gemini (ücretsiz katman)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    note: "Google hesabıyla kredi kartısız ücretsiz anahtar. Türkçesi çok iyi; önerilen.",
  },
  {
    id: "groq",
    name: "Groq (ücretsiz katman)",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    note: "Çok hızlı yanıt; ücretsiz kullanım sınırları var.",
  },
  {
    id: "openrouter",
    name: "OpenRouter (ücretsiz modeller)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
    note: "Adı “:free” ile biten modeller ücretsizdir (günlük sınırlı).",
  },
  {
    id: "ollama",
    name: "Ollama Cloud",
    baseUrl: "https://ollama.com/v1",
    model: "gpt-oss:120b",
    keyUrl: "https://ollama.com/settings/keys",
    note: "Kredi/abonelik gerektirir.",
  },
  { id: "custom", name: "Diğer (OpenAI uyumlu)", baseUrl: "", model: "", keyUrl: "", note: "Kendi adresini ve modelini yaz." },
];

export function llmConfig() {
  const s = getSettings();
  if (!s.llmKey || !s.llmBaseUrl || !s.llmModel) return null;
  return { baseUrl: s.llmBaseUrl.replace(/\/$/, ""), key: s.llmKey, model: s.llmModel };
}

export function browserLlmReady() {
  return Boolean(llmConfig());
}

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function post(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const cfg = llmConfig();
  if (!cfg) throw new Error("Yapay zekâ anahtarı girilmemiş (Ayarlar → Telefonda yapay zekâ).");
  let r: Response;
  try {
    r = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, ...body }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Yapay zekâ servisine bağlanılamadı (internet bağlantısını ve servis adresini kontrol edin).");
  }
  if (!r.ok) {
    const t = await r.text();
    let msg = t.slice(0, 300);
    try {
      const j = JSON.parse(t);
      msg = (Array.isArray(j) ? j[0]?.error?.message : j.error?.message) || j.message || msg;
    } catch {
      /* düz metin */
    }
    if (r.status === 401 || r.status === 403) throw new Error(`Anahtar geçersiz ya da yetkisiz: ${msg}`);
    if (r.status === 429) throw new Error(`Ücretsiz kullanım sınırına ulaşıldı, biraz sonra tekrar deneyin. (${msg})`);
    throw new Error(`Yapay zekâ servisi hatası (${r.status}): ${msg}`);
  }
  return r;
}

/** Akışlı sohbet (SSE). */
export async function llmStream(messages: ChatMessage[], onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const r = await post("/chat/completions", { messages, stream: true }, signal);
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
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let ev: { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.error) throw new Error(ev.error.message || "Yapay zekâ servisi hatası");
      let t = ev.choices?.[0]?.delta?.content || "";
      // Bazı modellerin düşünme etiketlerini gösterme
      if (t.includes("<think>")) inThink = true;
      if (inThink) {
        if (!t.includes("</think>")) continue;
        inThink = false;
        t = t.slice(t.indexOf("</think>") + 8);
      }
      if (t) {
        full += t;
        onText(t);
      }
    }
  }
  return full;
}

function extractJson(text: string): unknown {
  const t = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  const body = fenced ? fenced[1] : t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
  return JSON.parse(body);
}

/** Şemaya uygun JSON üretir; geçersizse bir kez düzeltmesini ister. */
export async function llmJson<T>(system: string, content: string, schema: z.ZodType<T>): Promise<T> {
  const jsonSchema = JSON.stringify(toJSONSchema(schema));
  const messages: ChatMessage[] = [
    { role: "system", content: `${system}\n\nRespond with ONLY a JSON object (no markdown) that matches this JSON Schema:\n${jsonSchema}` },
    { role: "user", content },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    let r: Response;
    try {
      r = await post("/chat/completions", { messages, response_format: { type: "json_object" } });
    } catch (e) {
      // Bazı servisler response_format desteklemez: onsuz dene
      if (/\(400\)/.test((e as Error).message)) r = await post("/chat/completions", { messages });
      else throw e;
    }
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content || "";
    try {
      const res = schema.safeParse(extractJson(text));
      if (res.success) return res.data;
      messages.push({ role: "assistant", content: text }, { role: "user", content: `The JSON does not match the schema: ${res.error.message.slice(0, 500)}. Return the corrected JSON only.` });
    } catch {
      messages.push({ role: "assistant", content: text }, { role: "user", content: "That was not valid JSON. Return ONLY the JSON object." });
    }
  }
  throw new Error("Model geçerli bir yanıt üretmedi, tekrar deneyin.");
}

// ---------- Asistan (araç çağırma) ----------

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
export type AgentMsg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; calls: ToolCall[]; raw?: unknown; provider?: string }
  | { role: "tool"; results: { id: string; name: string; output: string; isError?: boolean }[] };

export async function llmAgentTurn(history: AgentMsg[], state: string): Promise<{ text: string; calls: ToolCall[]; provider: string }> {
  const messages: ChatMessage[] = [{ role: "system", content: AGENT_SYSTEM }];
  history.forEach((m, i) => {
    if (m.role === "user") {
      const isLastUser = !history.slice(i + 1).some((x) => x.role === "user");
      messages.push({ role: "user", content: isLastUser ? `${m.text}\n\n<app_state>${state}</app_state>` : m.text });
    } else if (m.role === "assistant") {
      messages.push({
        role: "assistant",
        content: m.text || null,
        ...(m.calls.length ? { tool_calls: m.calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}),
      });
    } else for (const r of m.results) messages.push({ role: "tool", tool_call_id: r.id, content: r.output });
  });
  const r = await post("/chat/completions", {
    messages,
    tools: TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })),
  });
  const data = (await r.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: { id?: string; function: { name: string; arguments: string | Record<string, unknown> } }[] } }[];
  };
  const msg = data.choices?.[0]?.message;
  const known = new Set(TOOLS.map((t) => t.name));
  const calls: ToolCall[] = (msg?.tool_calls || [])
    .filter((c) => known.has(c.function.name))
    .map((c, i) => {
      let input: Record<string, unknown> = {};
      try {
        input = typeof c.function.arguments === "string" ? JSON.parse(c.function.arguments || "{}") : c.function.arguments;
      } catch {
        /* boş */
      }
      return { id: c.id || `call_${Date.now().toString(36)}_${i}`, name: c.function.name, input };
    });
  return { text: (msg?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim(), calls, provider: "browser" };
}

/** Anahtarı dener: kısa bir istek gönderir. */
export async function testLlm(): Promise<string> {
  let out = "";
  await llmStream([{ role: "user", content: "Reply with exactly one word: Merhaba" }], (t) => (out += t));
  return out.trim();
}

/** Servisteki model adlarını listeler (OpenAI uyumlu /models). */
export async function listModels(baseUrl: string, key: string): Promise<string[]> {
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Model listesi alınamadı (${r.status})`);
  const d = (await r.json()) as { data?: { id: string }[] };
  return (d.data || []).map((m) => m.id.replace(/^models\//, "")).sort();
}
