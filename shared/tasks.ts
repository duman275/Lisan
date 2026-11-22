// Sunucu (Claude/Ollama) ve tarayıcı (telefon: Gemini/Groq/OpenRouter) için ortak görev tanımları:
// istemler, mesajlar ve yapılandırılmış çıktı şemaları.
import { z } from "zod";
import * as P from "./prompts.ts";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

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

export function clip(s: string | undefined, max = LIMIT): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

export function buildStreamPrompt(req: StreamRequest): {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  /** Analiz: web araştırması yapılmalı (Claude: web_search; diğerleri: Wikipedia bağlamı) */
  webResearch?: boolean;
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
        webResearch: true,
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

// ---------- Yapılandırılmış (JSON) görevler ----------

export const Lesson = z.object({
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

export function buildJsonPrompt(req: JsonRequest): { system: string; content: string; schema: z.ZodType; effort: Effort } {
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

  return { system, content, schema, effort };
}
