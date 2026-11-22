// Yardımcı ajan: uygulamayı yönetebilen, sesli komutlara yanıt veren asistan.
// Araçlar TARAYICIDA çalışır (gezinme, oynatıcı, kartlar...); sunucu yalnızca modelin bir turunu yürütür.
// İki sağlayıcı: Claude (API anahtarı ile) veya Ollama (bilgisayarında yerel çalışan, tamamen ücretsiz model).
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_BETA, getClient, MODEL, aiAvailable } from "./ai.ts";
import { AGENT_SYSTEM as SYSTEM, TOOLS } from "../shared/agentDef.ts";
import { checkOllama, ollamaHeaders, OLLAMA_MODEL, OLLAMA_URL, thinkParam, type OllamaMessage } from "./ollama.ts";

export const AGENT_MODEL = process.env.AGENT_MODEL || MODEL;

export type Provider = "claude" | "ollama";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AgentMsg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; calls: ToolCall[]; raw?: unknown; provider?: Provider }
  | { role: "tool"; results: { id: string; name: string; output: string; isError?: boolean }[] };

export interface AgentTurn {
  text: string;
  calls: ToolCall[];
  raw?: unknown;
  provider: Provider;
}

export async function pickProvider(pref?: string): Promise<Provider | null> {
  if (pref === "free") return null;
  const ollama = (await checkOllama()).available;
  if (pref === "ollama" && ollama) return "ollama";
  if (pref === "claude" && aiAvailable()) return "claude";
  if (aiAvailable()) return "claude";
  if (ollama) return "ollama";
  return null;
}

export async function agentTurn(history: AgentMsg[], state: string, provider: Provider): Promise<AgentTurn> {
  if (!history.length || history[0].role !== "user") throw new Error("Sohbet kullanıcı mesajıyla başlamalı");
  return provider === "claude" ? claudeTurn(history, state) : ollamaTurn(history, state);
}

// ---------- Claude ----------

async function claudeTurn(history: AgentMsg[], state: string): Promise<AgentTurn> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  history.forEach((m, i) => {
    if (m.role === "user") {
      // Uygulama durumu yalnızca son kullanıcı mesajına eklenir (önbellek ön eki sabit kalsın)
      const isLastUser = !history.slice(i + 1).some((x) => x.role === "user");
      messages.push({ role: "user", content: isLastUser ? `${m.text}\n\n<app_state>${state}</app_state>` : m.text });
    } else if (m.role === "assistant") {
      // Claude'un kendi ürettiği bloklar (düşünme blokları dahil) değiştirilmeden geri gönderilir
      if (m.provider === "claude" && Array.isArray(m.raw)) messages.push({ role: "assistant", content: m.raw as Anthropic.Beta.BetaContentBlockParam[] });
      else
        messages.push({
          role: "assistant",
          content: [
            ...(m.text ? [{ type: "text" as const, text: m.text }] : []),
            ...m.calls.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.name, input: c.input })),
          ],
        });
    } else {
      messages.push({
        role: "user",
        content: m.results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.id, content: r.output, is_error: r.isError || undefined })),
      });
    }
  });

  const tools: Anthropic.Beta.BetaToolUnion[] = [
    ...TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Beta.BetaTool.InputSchema })),
    { type: "web_search_20260209", name: "web_search", max_uses: 3 },
  ];
  // Son araca önbellek işareti: araç tanımları + sistem istemi her turda yeniden kullanılır
  const last = tools[TOOLS.length - 1] as Anthropic.Beta.BetaTool;
  last.cache_control = { type: "ephemeral" };

  const convo = [...messages];
  for (let round = 0; round < 3; round++) {
    const msg = await getClient().beta.messages.create({
      model: AGENT_MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low" },
      tools,
      messages: convo,
    });
    if (msg.stop_reason === "refusal") return { text: "Bu isteğe yardımcı olamıyorum.", calls: [], provider: "claude" };
    if (msg.stop_reason === "pause_turn") {
      convo.push({ role: "assistant", content: msg.content });
      continue;
    }
    let text = "";
    const calls: ToolCall[] = [];
    for (const b of msg.content) {
      if (b.type === "text") text += b.text;
      else if (b.type === "tool_use") calls.push({ id: b.id, name: b.name, input: (b.input || {}) as Record<string, unknown> });
    }
    return { text: text.trim(), calls, raw: msg.content, provider: "claude" };
  }
  return { text: "Araştırma uzun sürdü, lütfen tekrar sorar mısın?", calls: [], provider: "claude" };
}

// ---------- Ollama (yerel, ücretsiz) ----------

async function ollamaTurn(history: AgentMsg[], state: string): Promise<AgentTurn> {
  const messages: OllamaMessage[] = [{ role: "system", content: SYSTEM }];
  history.forEach((m, i) => {
    if (m.role === "user") {
      const isLastUser = !history.slice(i + 1).some((x) => x.role === "user");
      messages.push({ role: "user", content: isLastUser ? `${m.text}\n\n<app_state>${state}</app_state>` : m.text });
    } else if (m.role === "assistant") {
      messages.push({ role: "assistant", content: m.text, tool_calls: m.calls.map((c) => ({ function: { name: c.name, arguments: c.input } })) });
    } else {
      for (const r of m.results) messages.push({ role: "tool", content: r.output, tool_name: r.name });
    }
  });

  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: ollamaHeaders(),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      ...thinkParam(),
      tools: TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Ollama hatası (${r.status}): ${(await r.text()).slice(0, 200)}. "ollama pull ${OLLAMA_MODEL}" komutunu çalıştırdınız mı?`);
  const data = (await r.json()) as { message?: { content?: string; tool_calls?: { function: { name: string; arguments: Record<string, unknown> | string } }[] } };
  const known = new Set(TOOLS.map((t) => t.name));
  const calls: ToolCall[] = (data.message?.tool_calls || [])
    .filter((c) => known.has(c.function.name))
    .map((c, i) => ({
      id: `ol_${Date.now().toString(36)}_${i}`,
      name: c.function.name,
      input: typeof c.function.arguments === "string" ? safeJson(c.function.arguments) : c.function.arguments || {},
    }));
  const text = (data.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return { text, calls, provider: "ollama" };
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
