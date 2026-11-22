// Asistanın ve sesli komutların uygulamada yaptığı işlemler.
import type { Route } from "../components/common";
import { openGutenberg } from "../components/Library";
import { CATALOG } from "../data/catalog";
import { COURSES } from "../data/courses";
import { langByCode, LEVELS } from "../data/languages";
import { newCard, type Card } from "./srs";
import { DEFAULT_PROGRESS, getSettings, getStored, libraryMeta, setStored, type Progress, type Settings } from "./store";
import { narrator } from "./tts";

let nav: { go: (r: Route) => void; route: () => Route } = { go: () => {}, route: () => ({ tab: "learn" }) };
export function registerNav(go: (r: Route) => void, route: () => Route) {
  nav = { go, route };
}

function updateSettings(patch: Partial<Settings>) {
  setStored("settings", { ...getSettings(), ...patch });
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function matchScore(query: string, ...fields: (string | undefined)[]) {
  const q = norm(query);
  if (!q) return 0;
  let best = 0;
  for (const f of fields) {
    if (!f) continue;
    const t = norm(f);
    if (t === q) best = Math.max(best, 3);
    else if (t.includes(q) || q.includes(t)) best = Math.max(best, 2);
    else {
      const words = q.split(" ").filter((w) => w.length > 2);
      const hit = words.filter((w) => t.includes(w)).length;
      if (words.length && hit / words.length >= 0.5) best = Math.max(best, 1);
    }
  }
  return best;
}

export async function appState(): Promise<string> {
  const s = getSettings();
  const p = { ...DEFAULT_PROGRESS, ...getStored<Progress>("progress", DEFAULT_PROGRESS) };
  const cards = getStored<Card[]>("cards", []);
  const lib = await libraryMeta();
  const now = Date.now();
  const r = nav.route();
  const n = narrator.state;
  return JSON.stringify({
    screen: { tab: r.tab, learnSection: r.learnSub, openBook: r.readerId ? lib.find((x) => x.id === r.readerId)?.title : undefined },
    player: n.total ? { playing: n.playing, paused: n.paused, title: n.title, sentence: n.index + 1, of: n.total, rate: s.rate } : "idle",
    learner: {
      nativeLanguage: s.nativeLang,
      targetLanguage: `${langByCode(s.targetLang).name} (${s.targetLang})`,
      level: s.levels[s.targetLang] || "A1",
      streakDays: p.streak,
      xp: p.xp,
      dueFlashcards: cards.filter((c) => c.lang === s.targetLang && c.due <= now).length,
      totalFlashcards: cards.filter((c) => c.lang === s.targetLang).length,
      completedUnits: Object.keys(p.doneUnits).filter((k) => k.startsWith(s.targetLang)).length,
    },
    library: lib.slice(0, 25).map((x) => x.title),
  });
}

type Input = Record<string, unknown>;

export async function runTool(name: string, input: Input): Promise<string> {
  const s = getSettings();
  switch (name) {
    case "get_app_state":
      return appState();

    case "navigate": {
      const tab = String(input.tab) as Route["tab"];
      nav.go(tab === "learn" ? { tab, learnSub: input.learn_section ? String(input.learn_section) : undefined } : { tab });
      return `Opened ${tab}${input.learn_section ? `/${input.learn_section}` : ""}.`;
    }

    case "player_control": {
      const a = String(input.action);
      const v = Number(input.value);
      const st = narrator.state;
      if (["pause", "resume", "next", "previous", "stop", "play"].includes(a) && !st.total) return "Nothing is loaded in the player. Open a book or text first.";
      if (a === "pause") narrator.pause();
      else if (a === "resume" || a === "play") narrator.resume();
      else if (a === "next") narrator.next();
      else if (a === "previous") narrator.prev();
      else if (a === "stop") narrator.stop();
      else if (a === "faster" || a === "slower" || a === "set_rate") {
        const rate = a === "set_rate" ? v : s.rate + (a === "faster" ? 0.15 : -0.15);
        const r = Math.round(Math.min(2, Math.max(0.5, rate || 1)) * 100) / 100;
        updateSettings({ rate: r });
        narrator.defaults.rate = r;
        if (narrator.state.playing) narrator.seek(narrator.state.index);
        return `Rate set to ${r}x.`;
      } else if (a === "sleep_timer") {
        narrator.setSleep(v > 0 ? v : null);
        return v > 0 ? `Sleep timer: ${v} minutes.` : "Sleep timer cancelled.";
      }
      return `Player: ${a} done.`;
    }

    case "set_learning": {
      const patch: Partial<Settings> = {};
      const lang = input.language ? String(input.language) : s.targetLang;
      if (input.language) patch.targetLang = lang;
      if (input.level && (LEVELS as readonly string[]).includes(String(input.level))) patch.levels = { ...s.levels, [lang]: String(input.level) };
      updateSettings(patch);
      return `Target language: ${langByCode(lang).name}, level: ${patch.levels?.[lang] || s.levels[lang] || "A1"}.`;
    }

    case "start_course": {
      const c = COURSES.find((x) => x.id === input.course);
      if (!c) return "Unknown course.";
      const unit = Number(input.unit);
      nav.go({ tab: "learn", learnSub: "courses", course: { course: c.id, unit: unit > 0 ? Math.min(unit, c.units.length) - 1 : undefined } });
      return unit > 0 ? `Opened ${c.name}, lesson ${unit}: ${c.units[unit - 1] || ""}` : `Opened course ${c.name} (${c.units.length} lessons).`;
    }

    case "add_flashcards": {
      const list = Array.isArray(input.cards) ? (input.cards as { word?: string; translation?: string; example?: string }[]) : [];
      const cards = getStored<Card[]>("cards", []);
      const ids = new Set(cards.map((c) => c.id));
      const add = list
        .filter((c) => c.word && c.translation)
        .map((c) => newCard(s.targetLang, { word: String(c.word), translation: String(c.translation), example: c.example ? String(c.example) : undefined }))
        .filter((c) => !ids.has(c.id));
      setStored("cards", [...cards, ...add]);
      return `Added ${add.length} new card(s)${list.length - add.length ? `, ${list.length - add.length} already existed` : ""}.`;
    }

    case "search_books": {
      const q = String(input.query || "");
      const lib = await libraryMeta();
      const libHits = lib.filter((x) => matchScore(q, x.title, x.author) > 0).slice(0, 8).map((x) => ({ title: x.title, where: "library", canOpen: true }));
      const catHits = CATALOG.flatMap((c) => c.books.map((b) => ({ b, cat: c.name })))
        .map((x) => ({ ...x, score: matchScore(q, x.b.title, x.b.original, x.b.author, x.cat) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((x) => ({ title: x.b.title, original: x.b.original, author: x.b.author, category: x.cat, canOpenFullText: Boolean(x.b.gid) }));
      return JSON.stringify({ library: libHits, catalog: catHits });
    }

    case "open_book": {
      const q = String(input.title || "");
      const lib = await libraryMeta();
      const libHit = lib.map((x) => ({ x, sc: matchScore(q, x.title, x.author) })).filter((y) => y.sc > 0).sort((a, b) => b.sc - a.sc)[0];
      if (libHit) {
        nav.go({ tab: "library", readerId: libHit.x.id, autoplay: Boolean(input.read_aloud) });
        return `Opened "${libHit.x.title}" from the library${input.read_aloud ? " and started reading aloud" : ""}.`;
      }
      const cat = CATALOG.flatMap((c) => c.books)
        .map((b) => ({ b, sc: matchScore(q, b.title, b.original, b.author) }))
        .filter((y) => y.sc > 0)
        .sort((a, b) => b.sc - a.sc)[0];
      if (!cat) return `No book matching "${q}" in the library or catalog. Suggest summarize_book or ask the user to upload a PDF.`;
      if (!cat.b.gid) return `"${cat.b.title}" is under copyright, so the full text is not available. Offer a summary (summarize_book) or analysis instead.`;
      const id = await openGutenberg(cat.b.gid, { title: cat.b.title, author: cat.b.author });
      nav.go({ tab: "library", readerId: id, autoplay: Boolean(input.read_aloud) });
      return `Downloaded and opened "${cat.b.title}"${input.read_aloud ? " and started reading aloud" : ""}.`;
    }

    case "summarize_book":
      nav.go({ tab: "summary", prefill: { title: String(input.title), author: input.author ? String(input.author) : undefined, mode: input.mode ? String(input.mode) : undefined, auto: true } });
      return `Summary of "${input.title}" is being generated on the Summaries page.`;

    case "analyze_book":
      nav.go({ tab: "analysis", prefill: { title: String(input.title), author: input.author ? String(input.author) : undefined, auto: true } });
      return `Researched analysis of "${input.title}" started on the Analysis page (takes 1-3 minutes).`;

    case "speak":
      narrator.say(String(input.text || ""), input.language ? String(input.language) : s.targetLang, input.slow ? 0.7 : 1);
      return "Spoken.";

    default:
      return `Unknown tool ${name}`;
  }
}

// ---------- Yerel sesli komutlar (yapay zekâ gerekmez, anında ve ücretsiz) ----------

const NUM: Record<string, number> = {
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, "on bes": 15, yirmi: 20, "yirmi bes": 25, otuz: 30, kirk: 40, "kirk bes": 45, elli: 50, altmis: 60,
  one: 1, two: 2, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, "forty five": 45, sixty: 60,
};

function findNumber(t: string): number | null {
  const d = /(\d+)/.exec(t);
  if (d) return Number(d[1]);
  const keys = Object.keys(NUM).sort((a, b) => b.length - a.length);
  for (const k of keys) if (new RegExp(`\\b${k}\\b`).test(t)) return NUM[k];
  return null;
}

export interface LocalCommand {
  label: string;
  run: () => void;
}

const NAV: [RegExp, Route, string][] = [
  [/\b(kartlar|kartlara|kartlari|kelime tekrar|flashcard)/, { tab: "learn", learnSub: "cards" }, "Kartlar açıldı"],
  [/\b(hikaye|story)/, { tab: "learn", learnSub: "story" }, "Hikâyeler açıldı"],
  [/\b(ogretmen|tutor|konusma pratigi|sesli sohbet)/, { tab: "learn", learnSub: "tutor" }, "Öğretmen açıldı"],
  [/\b(kurs|kurslar|course)/, { tab: "learn", learnSub: "courses" }, "Kurslar açıldı"],
  [/\b(mufredat|uniteler|derse devam)/, { tab: "learn", learnSub: "path" }, "Müfredat açıldı"],
  [/\b(seviye test|seviyemi olc|placement)/, { tab: "learn", learnSub: "test" }, "Seviye testi açıldı"],
  [/\b(kutuphane|library)/, { tab: "library" }, "Kütüphane açıldı"],
  [/\b(efsane|katalog|catalog)/, { tab: "catalog" }, "Efsane kitaplar açıldı"],
  [/\b(ozetler|ozet sayfa)/, { tab: "summary" }, "Özetler açıldı"],
  [/\b(analiz sayfa|analiz sekme)/, { tab: "analysis" }, "Analiz açıldı"],
  [/\b(ayarlar|settings)/, { tab: "settings" }, "Ayarlar açıldı"],
  [/\b(ana sayfa|bugun|home|ogren sekme)/, { tab: "learn", learnSub: "today" }, "Bugün açıldı"],
];

/** Kısa ve net komutları yerelde çözer; karmaşık istekler için null döner (asistana gider). */
export function parseLocal(raw: string): LocalCommand | null {
  const t = norm(raw);
  if (!t || t.split(" ").length > 6) return null;
  const has = (re: RegExp) => re.test(t);
  const s = getSettings();
  const loaded = narrator.state.total > 0;

  if (has(/\b(dakika|minute)/) && has(/\b(uyku|kapat|sonra|uyut|sleep|zamanlayici)/)) {
    const n = findNumber(t);
    if (n) return { label: `🌙 ${n} dakika sonra duracak`, run: () => narrator.setSleep(n) };
  }
  if (has(/\b(hizlandir|daha hizli|faster|speed up)/))
    return { label: "⏩ Hız artırıldı", run: () => void runTool("player_control", { action: "faster" }) };
  if (has(/\b(yavasla|yavaslat|daha yavas|slower|slow down)/))
    return { label: "⏪ Hız azaltıldı", run: () => void runTool("player_control", { action: "slower" }) };
  if (loaded) {
    if (has(/^(dur|duraklat|durdur|bekle|pause|sus)\b|\b(duraklat|durdur)\b/)) return { label: "⏸ Duraklatıldı", run: () => narrator.pause() };
    if (has(/\b(devam|oynat|play|resume|surdur|baslat)\b/) && !has(/\b(ders|kurs|kitab)/)) return { label: "▶ Devam ediliyor", run: () => narrator.resume() };
    if (has(/\b(sonraki|ileri|next|atla)\b/)) return { label: "⏭ Sonraki", run: () => narrator.next() };
    if (has(/\b(onceki|geri sar|previous|tekrarla|bir daha oku)\b/)) return { label: "⏮ Önceki", run: () => narrator.prev() };
    if (has(/\b(kapat|sustur|stop|bitir)\b/) && !has(/\b(sekme|sayfa)/)) return { label: "⏹ Durduruldu", run: () => narrator.stop() };
  }
  for (const [re, route, label] of NAV) if (has(re)) return { label, run: () => nav.go(route) };
  if (has(/\b(sesli oku|oku bunu|okumaya basla|dinlemeye basla)\b/) && nav.route().readerId)
    return { label: "🎧 Okuma başladı", run: () => nav.go({ ...nav.route(), autoplay: true }) };
  void s;
  return null;
}
