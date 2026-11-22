// Yardımcı ajan: uygulamayı yönetebilen, sesli komutlara yanıt veren asistan.
// Araçlar TARAYICIDA çalışır (gezinme, oynatıcı, kartlar...); sunucu yalnızca modelin bir turunu yürütür.
// İki sağlayıcı: Claude (API anahtarı ile) veya Ollama (bilgisayarında yerel çalışan, tamamen ücretsiz model).
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_BETA, getClient, MODEL, aiAvailable } from "./ai.ts";
import { checkOllama, OLLAMA_MODEL, OLLAMA_URL, type OllamaMessage } from "./ollama.ts";

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

const SYSTEM = `You are "Lisan Asistan", the built-in helper of Lisan, a language-learning and audiobook app. The user usually talks to you by VOICE, often in Turkish. Your replies are read aloud, so keep them short (1-3 sentences), warm and natural, with no markdown, lists or emojis. Reply in the user's language.

You can operate the app with tools. Prefer acting over explaining: if the user asks to open, play, read, summarize, add, change or start something, call the right tool(s) and then confirm briefly what you did. If a request is ambiguous, make a sensible choice; ask only when you truly cannot proceed.

App map:
- Learn ("Öğren"): target language & CEFR level, today's plan, CEFR curriculum, courses (everyday conversation, speaking fluency, native-like English, business), flashcards (spaced repetition), graded stories, AI tutor (text or hands-free voice conversation), placement test, method.
- Library ("Kütüphane"): user's books, uploaded PDFs and saved texts; reader with read-aloud, "explain this page", "turn into podcast".
- Legends ("Efsaneler"): catalog of legendary books by category; public-domain ones can be opened in full.
- Summaries ("Özetler") and Analysis ("Analiz": symbolism, themes, subtext with web research).
- Settings ("Ayarlar").
Use get_app_state when you need to know what is on screen, what is playing, or the learner's progress.
Language learning advice: recommend the daily plan (spaced repetition + comprehensible input + speaking practice), be encouraging and concrete.`;

// Araçların tek kaynağı (JSON şeması); iki sağlayıcıya da çevrilir.
export const TOOLS: { name: string; description: string; input_schema: Record<string, unknown> }[] = [
  {
    name: "get_app_state",
    description: "Returns what is on screen, the player state, target language, level, streak, XP, due flashcards, current book and library items.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "navigate",
    description: "Open a section of the app.",
    input_schema: {
      type: "object",
      properties: {
        tab: { type: "string", enum: ["learn", "library", "catalog", "summary", "analysis", "settings"] },
        learn_section: {
          type: "string",
          enum: ["today", "path", "courses", "cards", "story", "tutor", "test", "method"],
          description: "Only for tab=learn",
        },
      },
      required: ["tab"],
      additionalProperties: false,
    },
  },
  {
    name: "player_control",
    description: "Control the audio player (read-aloud / podcast).",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["play", "pause", "resume", "next", "previous", "stop", "faster", "slower", "set_rate", "sleep_timer"] },
        value: { type: "number", description: "Rate (0.5-2) for set_rate, minutes for sleep_timer (0 cancels)." },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "set_learning",
    description: "Change the target language and/or CEFR level.",
    input_schema: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["en-US", "de-DE", "fr-FR", "es-ES", "it-IT", "pt-BR", "nl-NL", "ru-RU", "ar-SA", "ja-JP", "ko-KR", "zh-CN", "tr-TR"] },
        level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "start_course",
    description: "Open a course and optionally a unit. Courses: daily (everyday conversation), speaking (speaking fluency), native (native-like English: idioms, phrasal verbs, slang, connected speech), business.",
    input_schema: {
      type: "object",
      properties: {
        course: { type: "string", enum: ["daily", "speaking", "native", "business"] },
        unit: { type: "integer", description: "1-based unit number (optional)" },
      },
      required: ["course"],
      additionalProperties: false,
    },
  },
  {
    name: "add_flashcards",
    description: "Add vocabulary cards to the user's spaced-repetition deck for the current target language.",
    input_schema: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: { word: { type: "string" }, translation: { type: "string" }, example: { type: "string" } },
            required: ["word", "translation"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
  },
  {
    name: "search_books",
    description: "Search the legendary books catalog and the user's library. Returns matching titles and whether they can be opened in full.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
  },
  {
    name: "open_book",
    description: "Open a book in the reader (from the user's library or a public-domain catalog book) and optionally start reading it aloud.",
    input_schema: {
      type: "object",
      properties: { title: { type: "string" }, read_aloud: { type: "boolean" } },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "summarize_book",
    description: "Open the Summaries page and generate a summary of any book.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        mode: { type: "string", enum: ["kisa", "detayli", "karakterler", "fikirler"], description: "kisa=5-minute, detayli=chapter by chapter, karakterler=characters, fikirler=key ideas" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "analyze_book",
    description: "Open the Analysis page and start a researched analysis (symbolism, themes, subtext, author interviews, adaptations, fan theories).",
    input_schema: {
      type: "object",
      properties: { title: { type: "string" }, author: { type: "string" } },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "speak",
    description: "Read a text aloud in a given language (e.g. to demonstrate pronunciation).",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" }, language: { type: "string", description: "BCP-47 code such as en-US" }, slow: { type: "boolean" } },
      required: ["text"],
      additionalProperties: false,
    },
  },
];

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      think: false,
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
