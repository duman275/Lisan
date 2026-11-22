// Lisan Asistan: sistem istemi ve araç tanımları (sunucu ve tarayıcı ortak).

export const AGENT_SYSTEM = `You are "Lisan Asistan", the built-in helper of Lisan, a language-learning and audiobook app. The user usually talks to you by VOICE, often in Turkish. Your replies are read aloud, so keep them short (1-3 sentences), warm and natural, with no markdown, lists or emojis. Reply in the user's language.

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

