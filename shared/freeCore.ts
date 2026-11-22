// Ücretsiz mod: yapay zekâ olmadan, açık veri kaynaklarından içerik üretir.
//  - Tatoeba İngilizce–Türkçe cümle çiftleri (CC-BY 2.0 FR) → dersler, alıştırmalar, örnek cümleler, seviye testi
//  - OpenSubtitles sıklık listesi (CC-BY-SA 4.0) → sıklık sıralı kelime desteleri
//  - İstatistiksel sözlük (derlemden çıkarılmış) → yaklaşık kelime anlamları
//  - Wikipedia (CC BY-SA) → kitap özetleri ve tema/sembol bölümleri
// Hem sunucuda (Node) hem tarayıcıda (GitHub Pages / telefon) çalışır; dosya okuma yapmaz.
import { FREE_UNITS } from "./freeUnits.ts";

interface Pair {
  id: string;
  hardest: number;
  en: string;
  tr: string;
  lower: string;
  n: number;
}

let pairs: Pair[] = [];
let index = new Map<string, number[]>();
let gloss: Record<string, [string, number]> = {};
let freqEn: string[] = [];
let rankEn = new Map<string, number>();
let loaded = false;

const tokEn = (s: string) => s.toLowerCase().replace(/[’]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) || [];

export interface FreeDataText {
  pairsTsv: string;
  glossJson: string;
  freqEnTxt: string;
}

/** Veriyi (gzip'i açılmış metin olarak) yükler ve dizini kurar. */
export function initFreeData(d: FreeDataText) {
  if (loaded) return;
  for (const line of d.pairsTsv.split("\n")) {
    const [id, hardest, en, tr] = line.split("\t");
    if (!en || !tr) continue;
    const toks = tokEn(en);
    const i = pairs.push({ id, hardest: Number(hardest), en, tr, lower: en.toLowerCase(), n: toks.length }) - 1;
    for (const t of new Set(toks)) {
      let list = index.get(t);
      if (!list) index.set(t, (list = []));
      list.push(i);
    }
  }
  gloss = JSON.parse(d.glossJson);
  freqEn = d.freqEnTxt.split("\n");
  freqEn.forEach((w, i) => rankEn.set(w, i + 1));
  loaded = true;
}

export function freeReady() {
  return loaded;
}

// Seviyeye göre izin verilen en nadir kelime sırası
const CAP: Record<string, number> = { A1: 800, A2: 1500, B1: 3000, B2: 6000, C1: 12000, C2: 40000, Native: 40000 };
const FLOOR: Record<string, number> = { A1: 0, A2: 500, B1: 1200, B2: 2500, C1: 5000, C2: 10000, Native: 10000 };
const STOP = new Set(
  "the a an and or but to of in on at for with is are was were be been i you he she it we they me him her us them my your his its our their this that these those do does did not no yes so if as by from up out about what who how when where why which there here can will would could should just".split(
    " ",
  ),
);

function rand<T>(arr: T[], seed: { s: number }): T {
  seed.s = (seed.s * 1103515245 + 12345) % 2147483648;
  return arr[seed.s % arr.length];
}
function shuffle<T>(arr: T[], seed: { s: number }): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed.s = (seed.s * 1103515245 + 12345) % 2147483648;
    const j = seed.s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  return h;
}

/** Kelime veya kalıbı içeren cümleleri bulur (seviyeye uygun olanlar önce). */
function findSentences(phrase: string, level: string, limit = 5, maxWords = 12): Pair[] {
  const toks = tokEn(phrase);
  if (!toks.length) return [];
  // En nadir kelimenin listesinden başla
  const lists = toks.map((t) => index.get(t) || []);
  const base = lists.reduce((a, b) => (a.length <= b.length ? a : b));
  const p = phrase.toLowerCase().replace(/[’]/g, "'");
  const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  const cap = CAP[level] ?? 3000;
  const hits = base.map((i) => pairs[i]).filter((x) => x.n >= 3 && x.n <= maxWords && re.test(x.lower));
  const fit = hits.filter((x) => x.hardest <= cap);
  const pool = (fit.length >= limit ? fit : hits).sort((a, b) => a.hardest - b.hardest || a.n - b.n);
  // Çeşitlilik: en kolay olanlardan değil, uygun aralığın tamamından seç
  const step = Math.max(1, Math.floor(pool.length / limit));
  const out: Pair[] = [];
  for (let i = 0; i < pool.length && out.length < limit; i += step) out.push(pool[i]);
  return out;
}

function glossOf(word: string): string | undefined {
  const w = word.toLowerCase();
  const cands = [w, w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""), w.replace(/ed$/, ""), w.replace(/ed$/, "e"), w.replace(/ing$/, ""), w.replace(/ing$/, "e")];
  for (const c of cands) if (gloss[c]) return gloss[c][0];
  return undefined;
}

// ---------- Ders ----------

// Native seviyesi üniteleri, ana dil gibi konuşma kursunun içeriklerini kullanır
const NATIVE_MAP = ["course:native:0", "course:native:3", "course:native:2", "course:native:5", "course:native:13", "course:native:8", "course:native:14", "course:native:7", "C1:7", "course:native:9"];

export function freeLesson(unitKey: string, level: string, topic: string) {
  const nm = /^Native:(\d+)$/.exec(unitKey);
  const unit = FREE_UNITS[nm ? NATIVE_MAP[Number(nm[1])] : unitKey];
  if (!unit) throw new Error("Bu ünite için ücretsiz içerik bulunamadı.");
  const seed = { s: hash(unitKey) };
  const lv = level in CAP ? level : "B1";

  // Örnek cümleler (anahtar kelimelerden)
  const examples: Pair[] = [];
  const seen = new Set<string>();
  // Ünitenin kendi kalıp cümleleri her zaman örneklerin başında yer alır
  for (const [en, tr] of unit.patterns) {
    seen.add(en);
    examples.push({ id: "", hardest: 0, en, tr, lower: en.toLowerCase(), n: tokEn(en).length });
  }
  for (const k of unit.keywords) {
    for (const s of findSentences(k, lv, 2)) {
      if (!seen.has(s.en)) {
        seen.add(s.en);
        examples.push(s);
      }
    }
  }

  // Kelimeler: anahtar kelimeler + örneklerdeki seviyeye uygun yeni kelimeler
  const vocab: { word: string; reading: string; translation: string; example: string; exampleTranslation: string }[] = [];
  const used = new Set<string>();
  for (const k of unit.keywords) {
    const ex = findSentences(k, lv, 1)[0];
    const tr = k.includes(" ") ? undefined : glossOf(k);
    const pat = unit.patterns.find(([en]) => en.toLowerCase().includes(k.toLowerCase()));
    if (!ex && !tr && !pat) continue;
    used.add(k);
    const e = ex ? { en: ex.en, tr: ex.tr } : pat ? { en: pat[0], tr: pat[1] } : { en: "", tr: "" };
    vocab.push({ word: k, reading: "", translation: tr ? `${tr} (yaklaşık)` : "↓ örnek cümleye bak", example: e.en, exampleTranslation: e.tr });
  }
  for (const ex of examples) {
    if (vocab.length >= 14) break;
    for (const w of tokEn(ex.en)) {
      const r = rankEn.get(w) ?? 99999;
      if (used.has(w) || STOP.has(w) || r < Math.max(FLOOR[lv] ?? 0, 150) || r > (CAP[lv] ?? 3000) || !gloss[w] || gloss[w][1] < 30) continue;
      used.add(w);
      vocab.push({ word: w, reading: "", translation: `${gloss[w][0]} (yaklaşık)`, example: ex.en, exampleTranslation: ex.tr });
      break;
    }
  }

  // Alıştırmalar
  const exercises: { kind: "mcq" | "fill" | "translate" | "order"; prompt: string; options: string[]; answer: string; explanation: string }[] = [];
  const single = vocab.filter((v) => !v.word.includes(" ") && v.example);
  const pool = shuffle(examples.slice(unit.patterns.length), seed);
  if (pool.length < 4) pool.push(...shuffle(examples.slice(0, unit.patterns.length), seed));
  // 1) Boşluk doldurma (çoktan seçmeli)
  for (const v of shuffle(single, seed).slice(0, 3)) {
    const re = new RegExp(`\\b${v.word}\\b`, "i");
    if (!re.test(v.example)) continue;
    const others = shuffle(single.filter((x) => x.word !== v.word).map((x) => x.word), seed).slice(0, 3);
    if (others.length < 2) continue;
    exercises.push({
      kind: "mcq",
      prompt: `Boşluğu doldur: “${v.example.replace(re, "_____")}”  (${v.exampleTranslation})`,
      options: shuffle([v.word, ...others], seed),
      answer: v.word,
      explanation: `${v.example} = ${v.exampleTranslation}`,
    });
  }
  // 2) Anlam seçme
  for (const ex of pool.slice(0, 2)) {
    const wrong = shuffle(examples.filter((x) => x !== ex), seed)
      .slice(0, 3)
      .map((x) => x.tr);
    if (wrong.length < 2) continue;
    exercises.push({ kind: "mcq", prompt: `Bu cümlenin anlamı hangisi? “${ex.en}”`, options: shuffle([ex.tr, ...wrong], seed), answer: ex.tr, explanation: "" });
  }
  // 3) Çeviri (Türkçe → İngilizce)
  for (const ex of pool.slice(2, 4)) exercises.push({ kind: "translate", prompt: `İngilizceye çevir: “${ex.tr}”`, options: [], answer: ex.en, explanation: "Benzer anlamlı farklı çeviriler de doğru olabilir." });
  // 4) Kelime sıralama
  for (const ex of [...unit.patterns.map(([en, tr]) => ({ en, tr })), ...pool.slice(4)].filter((x) => tokEn(x.en).length >= 4 && tokEn(x.en).length <= 9).slice(0, 2)) {
    const words = ex.en.replace(/[.,!?;:“”"]+/g, "").split(/\s+/).filter(Boolean);
    exercises.push({ kind: "order", prompt: `Kelimeleri doğru sıraya koy: “${ex.tr}”`, options: shuffle(words, seed), answer: words.join(" "), explanation: ex.en });
  }

  const explanation = [
    unit.tip,
    "",
    "**Kalıplar:**",
    ...unit.patterns.map(([en, tr]) => `- **${en}** — ${tr}`),
    "",
    "*Örnek cümleler Tatoeba topluluğunun gerçek cümleleridir; kelime anlamları derlemden otomatik çıkarıldığı için yaklaşıktır.*",
  ].join("\n");

  return {
    source: "free",
    title: topic,
    goal: `${topic} konusunda kalıpları anlamak ve kullanmak.`,
    explanation,
    vocab: vocab.slice(0, 14),
    dialogue: examples.slice(0, 14).map((e, i) => ({ speaker: i % 2 ? "B" : "A", line: e.en, translation: e.tr })),
    exercises,
    shadowing: [...unit.patterns.map(([en]) => en), ...pool.slice(0, 2).map((x) => x.en)].slice(0, 5),
  };
}

// ---------- Deste ----------

export function freeDeck(level: string, count: number, exclude: string[], topic?: string) {
  const ex = new Set(exclude.map((w) => w.toLowerCase()));
  const lv = level in CAP ? level : "A1";
  const cards: { word: string; reading: string; translation: string; example: string; exampleTranslation: string }[] = [];
  const topicToks = topic ? tokEn(topic) : [];
  const start = topicToks.length ? 0 : FLOOR[lv];
  for (let r = start; r < freqEn.length && cards.length < count; r++) {
    const w = freqEn[r];
    if (!w || ex.has(w) || STOP.has(w) || w.length < 2 || !gloss[w] || gloss[w][1] < 35) continue;
    // Çekimli biçimleri atla (kök daha önce geldiyse): boys → boy, died → die
    const base = [w.replace(/s$/, ""), w.replace(/ed$/, ""), w.replace(/d$/, ""), w.replace(/ing$/, ""), w.replace(/ies$/, "y")].find((b) => b !== w && (rankEn.get(b) ?? 99999) < r + 1);
    if (base) continue;
    const s = findSentences(w, lv, 3);
    const sent = topicToks.length ? s.find((x) => topicToks.some((t) => x.lower.includes(t))) : s[0];
    if (!sent) continue;
    cards.push({ word: w, reading: "", translation: gloss[w][0], example: sent.en, exampleTranslation: sent.tr });
  }
  return { cards };
}

// ---------- Sözlük ----------

export function freeDefine(word: string) {
  const w = word.toLowerCase();
  const tr = glossOf(w);
  const ex = findSentences(w, "C2", 2, 10);
  if (!tr && !ex.length) throw new Error("Bu kelime ücretsiz sözlükte yok. Daha iyi sonuç için Ollama ya da Claude kullanın.");
  return {
    lemma: word,
    partOfSpeech: "",
    meaning: tr ? `${tr} (yaklaşık, derlemden)` : "Anlam bulunamadı; örneklere bak.",
    pronunciation: "",
    example: ex.map((e) => `${e.en} — ${e.tr}`).join("\n"),
  };
}

// ---------- Seviye testi ----------

export function freePlacement() {
  const seed = { s: Date.now() % 2147483647 };
  const LV = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  const questions: { level: (typeof LV)[number]; question: string; options: string[]; answer: number }[] = [];
  for (const lv of LV) {
    const lo = FLOOR[lv];
    const hi = CAP[lv];
    const band = pairs.filter((p) => p.hardest > lo && p.hardest <= hi && p.n >= (lv === "A1" ? 3 : 6) && p.n <= 14 && !/\b(tom|mary)\b/i.test(p.en));
    for (let k = 0; k < 3 && band.length > 10; k++) {
      const q = rand(band, seed);
      const wrong = new Set<string>();
      while (wrong.size < 3) {
        const d = rand(band, seed);
        if (d !== q) wrong.add(d.tr);
      }
      const options = shuffle([q.tr, ...wrong], seed);
      questions.push({ level: lv, question: `Bu cümlenin anlamı hangisi?\n“${q.en}”`, options, answer: options.indexOf(q.tr) });
    }
  }
  return { questions };
}

// ---------- Wikipedia: özet ve analiz ----------

const IS_BROWSER = typeof window !== "undefined";
const UA: Record<string, string> = IS_BROWSER ? { Accept: "application/json" } : { "User-Agent": "Lisan/0.3 (open-source language learning app)", Accept: "application/json" };

interface WikiPage {
  lang: string;
  title: string;
  url: string;
  sections: { heading: string; text: string }[];
}

async function wikiFind(lang: string, query: string): Promise<string | null> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: "3", format: "json", origin: "*" }).toString();
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(12_000) });
  if (!r.ok) return null;
  const d = (await r.json()) as { query?: { search?: { title: string }[] } };
  return d.query?.search?.[0]?.title ?? null;
}

async function wikiPage(lang: string, title: string): Promise<WikiPage | null> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({ action: "query", prop: "extracts", explaintext: "1", redirects: "1", titles: title, format: "json", origin: "*" }).toString();
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return null;
  const d = (await r.json()) as { query?: { pages?: Record<string, { title: string; extract?: string }> } };
  const page = Object.values(d.query?.pages || {})[0];
  if (!page?.extract) return null;
  const sections: WikiPage["sections"] = [];
  let cur = { heading: "", text: "" };
  for (const line of page.extract.split("\n")) {
    const h = /^(={2,4})\s*(.+?)\s*\1$/.exec(line.trim());
    if (h) {
      if (cur.text.trim()) sections.push(cur);
      cur = { heading: h[2], text: "" };
    } else cur.text += line + "\n";
  }
  if (cur.text.trim()) sections.push(cur);
  return { lang, title: page.title, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`, sections };
}

export async function findBookPages(title: string, author?: string): Promise<WikiPage[]> {
  // Türkçe ve İngilizce Wikipedia aynı anda aranır
  const one = async (lang: string, hint: string) => {
    try {
      const t = (await wikiFind(lang, `${title} ${author || ""} ${hint}`.trim())) || (await wikiFind(lang, title));
      return t ? await wikiPage(lang, t) : null;
    } catch {
      return null;
    }
  };
  const res = await Promise.all([one("tr", "roman kitap"), one("en", "novel book")]);
  return res.filter((x): x is WikiPage => Boolean(x));
}

/** Kaynak toplamayı süreyle sınırlar: yetişmeyen kaynak atlanır. */
export function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/** Herhangi bir MediaWiki sitesinde (AWOIAF, Fandom) arayıp sayfa metnini getirir (parse API, HTML → metin). */
export async function mediaWikiPage(apiBase: string, siteBase: string, label: string, query: string): Promise<WikiPage | null> {
  try {
    const su = new URL(apiBase);
    su.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: "1", format: "json", origin: "*" }).toString();
    const sr = await fetch(su, { headers: UA, signal: AbortSignal.timeout(12_000) });
    if (!sr.ok) return null;
    const title = ((await sr.json()) as { query?: { search?: { title: string }[] } }).query?.search?.[0]?.title;
    if (!title) return null;
    const pu = new URL(apiBase);
    pu.search = new URLSearchParams({ action: "parse", page: title, prop: "text", redirects: "1", format: "json", formatversion: "2", origin: "*" }).toString();
    const pr = await fetch(pu, { headers: UA, signal: AbortSignal.timeout(15_000) });
    if (!pr.ok) return null;
    const html = ((await pr.json()) as { parse?: { text?: string } }).parse?.text || "";
    const text = html
      .replace(/<(script|style|table|sup|figure|nav)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, _l, h) => `\n== ${h.replace(/<[^>]+>/g, "").replace(/\[edit\]/gi, "").trim()} ==\n`)
      .replace(/<\/(p|li|div)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
    if (text.length < 200) return null;
    const sections: WikiPage["sections"] = [];
    let cur = { heading: "", text: "" };
    for (const line of text.split("\n")) {
      const h = /^== (.+) ==$/.exec(line.trim());
      if (h) {
        if (cur.text.trim()) sections.push(cur);
        cur = { heading: h[1], text: "" };
      } else cur.text += line + "\n";
    }
    if (cur.text.trim()) sections.push(cur);
    return { lang: label, title, url: `${siteBase}${encodeURIComponent(title.replace(/ /g, "_"))}`, sections };
  } catch {
    return null;
  }
}

/** Analiz için kaynak sayfaları: Wikipedia + (ipuçlarında geçiyorsa) ASOIAF wikileri. */
export async function researchPages(title: string, author?: string, topic?: string, hints?: string[]): Promise<WikiPage[]> {
  const jobs: Promise<WikiPage[] | WikiPage | null>[] = [findBookPages(topic ? `${title} ${topic.replace(/\(.*\)/, "")}` : title, author).catch(() => [])];
  const q = topic ? topic.replace(/^.*\((.+)\)$/, "$1") : title;
  // "mw:<api>|<site>|<etiket>" ipuçları: evrene özel wiki'ler (AWOIAF, Tolkien Gateway, Dune Wiki…)
  for (const hint of hints || []) {
    const m = /^mw:([^|]+)\|([^|]+)\|(.+)$/.exec(hint);
    if (m) jobs.push(mediaWikiPage(m[1], m[2], m[3], q));
  }
  const out = await Promise.all(jobs);
  return out.flat().filter((x): x is WikiPage => Boolean(x));
}

const SUMMARY_RE = /konu|özet|olay|hikâye|hikaye|içerik|plot|synopsis|summary|story/i;
const ANALYSIS_RE = /tema|sembol|simge|motif|analiz|yorum|eleştiri|üslup|anlatım|alegori|uyarlama|etki|kabul|themes?|symbol|motif|analysis|interpretation|style|allegor|reception|adaptation|legacy|influence|critic/i;

export function communityLinks(title: string, author?: string) {
  const q = encodeURIComponent(`${title} ${author || ""}`.trim());
  return [
    { title: `Reddit tartışmaları: ${title}`, url: `https://www.reddit.com/search/?q=${encodeURIComponent(`${title} symbolism themes`)}` },
    { title: `Fandom wiki araması`, url: `https://community.fandom.com/wiki/Special:Search?query=${q}` },
    { title: `Goodreads yorumları`, url: `https://www.goodreads.com/search?q=${q}` },
    { title: `LitCharts tema & sembol rehberi`, url: `https://www.litcharts.com/search?q=${q}` },
    { title: `Yazar söyleşileri (YouTube)`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${author || title} interview`)}` },
    { title: `The Paris Review söyleşileri`, url: `https://www.theparisreview.org/search?q=${encodeURIComponent(author || title)}` },
  ];
}

/** Wikipedia'dan özet veya analiz metni üretir (yapay zekâ olmadan). */
export async function wikiText(
  kind: "summary" | "analysis",
  title: string,
  author?: string,
  topic?: string,
  hints?: string[],
): Promise<{ text: string; sources: { url: string; title: string }[] }> {
  const pages = topic ? await researchPages(title, author, topic, hints) : await findBookPages(title, author);
  if (!pages.length) throw new Error("Wikipedia'da bu kitap bulunamadı (ya da Wikipedia'ya erişilemedi).");
  const re = kind === "summary" ? SUMMARY_RE : ANALYSIS_RE;
  const parts: string[] = [];
  const sources: { url: string; title: string }[] = [];
  for (const p of pages) {
    const lead = p.sections[0]?.heading === "" ? p.sections[0] : null;
    const isFan = p.lang.length > 2; // AWOIAF / Fandom
    const picked = isFan ? p.sections.filter((s) => s.text.trim().length > 80).slice(0, 5) : p.sections.filter((s) => s.heading && re.test(s.heading));
    if (!lead && !picked.length) continue;
    sources.push({ url: p.url, title: isFan ? `${p.lang}: ${p.title}` : `Wikipedia (${p.lang.toUpperCase()}): ${p.title}` });
    parts.push(`## ${p.title} — ${isFan ? p.lang : `Wikipedia ${p.lang === "tr" ? "(Türkçe)" : "(İngilizce)"}`}`);
    if (lead && (kind === "summary" || !picked.length)) parts.push(clipText(lead.text, 1500));
    for (const s of picked.slice(0, 5)) parts.push(`${s.heading ? `### ${s.heading}\n` : ""}${clipText(s.text, kind === "summary" ? 5000 : 3000)}`);
    if (kind === "summary" && p.lang === "tr" && picked.length) break; // Türkçe özet yeterli
  }
  if (!parts.length) throw new Error("Wikipedia sayfasında uygun bölüm bulunamadı.");
  if (kind === "analysis") {
    const links = communityLinks(title, author);
    parts.push("## Daha derine inmek için", ...links.map((l) => `- [${l.title}](${l.url})`));
    sources.push(...links);
  }
  parts.push(
    "",
    `*Bu metin yapay zekâ kullanılmadan Wikipedia'dan (CC BY-SA) alınmıştır. Yorumlu, kaynakları birleştiren bir ${kind === "summary" ? "özet" : "analiz"} için Ayarlar'dan ücretsiz Ollama ya da Claude seçebilirsiniz.*`,
  );
  return { text: parts.join("\n\n"), sources };
}

function clipText(t: string, max: number) {
  const s = t.trim().replace(/\n{3,}/g, "\n\n");
  return s.length > max ? s.slice(0, s.lastIndexOf(".", max) + 1 || max) + " …" : s;
}

export { tokEn };

// ---------- Görev yönlendirici (sunucu ve tarayıcı ortak) ----------

export const NEEDS_LLM =
  "Bu özellik bir dil modeli gerektirir. Ücretsiz seçenek: bilgisayarına Ollama kur (ollama.com) ve “ollama pull qwen3:8b” çalıştır; Lisan'ı o bilgisayarda açınca otomatik bulur. Alternatif: sunucuya Claude API anahtarı ekle.";

export interface FreeJsonRequest {
  task: string;
  targetLang?: string;
  nativeLang?: string;
  level?: string;
  topic?: string;
  count?: number;
  exclude?: string[];
  word?: string;
  unitKey?: string;
}

const isEnglish = (l?: string) => !l || /^english/i.test(l);
const isTurkish = (l?: string) => !l || /^türkçe|^turkish/i.test(l);

export function freeJsonTask(req: FreeJsonRequest): unknown {
  if (!loaded) throw new Error(`Ücretsiz veri yüklenemedi. ${NEEDS_LLM}`);
  const enTr = isEnglish(req.targetLang) && isTurkish(req.nativeLang);
  const onlyEn = "Ücretsiz (yapay zekâsız) içerik şimdilik İngilizce ↔ Türkçe içindir. Diğer diller bir dil modeli (Ollama ya da Claude) gerektirir.";
  switch (req.task) {
    case "lesson":
      if (!enTr) throw new Error(onlyEn);
      if (!req.unitKey) throw new Error("Ünite bilgisi eksik.");
      return freeLesson(req.unitKey, req.level || "A1", req.topic || "");
    case "deck":
      if (!enTr) throw new Error(onlyEn);
      return freeDeck(req.level || "A1", Math.min(req.count || 20, 40), req.exclude || [], req.topic);
    case "define":
      if (!isTurkish(req.nativeLang) || (req.targetLang && !isEnglish(req.targetLang))) throw new Error(onlyEn);
      return freeDefine(req.word || "");
    case "placement":
      if (!enTr) throw new Error(onlyEn);
      return freePlacement();
    default:
      throw new Error(NEEDS_LLM);
  }
}
