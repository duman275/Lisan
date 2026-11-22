#!/usr/bin/env node
// Ücretsiz ders verisini hazırlar (API gerekmez). Çıktılar data/ klasörüne yazılır ve depoya dahildir.
//  - Tatoeba İngilizce–Türkçe cümle çiftleri (CC-BY 2.0 FR, manythings.org derlemesi üzerinden)
//  - OpenSubtitles kelime sıklık listeleri (hermitdave/FrequencyWords, CC-BY-SA 4.0)
// Kullanım: node scripts/build-data.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../data");
mkdirSync(out, { recursive: true });

const PAIRS_URL = "https://raw.githubusercontent.com/ibodev1/sentence-pairs-parser/main/tur/tur.txt";
const FREQ = (l) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`;

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

const tokEn = (s) => s.toLowerCase().replace(/[’]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) || [];
const tokTr = (s) => s.toLocaleLowerCase("tr").match(/[a-zçğıöşüâî]+/g) || [];

// ---------- Sıklık listeleri ----------
console.log("Sıklık listeleri indiriliyor…");
const freqLangs = { en: "en", de: "de", fr: "fr", es: "es", it: "it", pt: "pt", nl: "nl", ru: "ru", ar: "ar", ko: "ko", zh: "zh_cn", tr: "tr" };
const rank = new Map();
for (const [code, src] of Object.entries(freqLangs)) {
  const words = (await get(FREQ(src)))
    .split("\n")
    .map((l) => l.split(" ")[0])
    .filter((w) => w && !/\d/.test(w))
    .slice(0, code === "en" ? 30000 : 10000);
  writeFileSync(path.join(out, `freq-${code}.txt.gz`), gzipSync(words.join("\n")));
  if (code === "en") words.forEach((w, i) => rank.set(w, i + 1));
  console.log(`  ${code}: ${words.length}`);
}

// ---------- Cümle çiftleri ----------
console.log("Tatoeba cümle çiftleri indiriliyor…");
const raw = await get(PAIRS_URL);
const seen = new Set();
const pairs = [];
for (const line of raw.split("\n")) {
  const [en, tr, attr] = line.split("\t");
  if (!en || !tr) continue;
  const id = /#(\d+)/.exec(attr || "")?.[1] || "";
  const words = tokEn(en);
  if (!words.length || words.length > 16 || seen.has(en)) continue;
  seen.add(en);
  // Zorluk: cümledeki en nadir kelimenin sıklık sırası (özel isimler hariç)
  let hardest = 1;
  for (const w of words) {
    const r = rank.get(w) ?? 40000;
    if (r > hardest) hardest = r;
  }
  pairs.push({ id, en: en.trim(), tr: tr.trim(), hardest, n: words.length });
}
console.log(`  ${pairs.length} benzersiz çift`);
writeFileSync(
  path.join(out, "en-tr.tsv.gz"),
  gzipSync(pairs.map((p) => [p.id, p.hardest, p.en, p.tr].join("\t")).join("\n")),
);

// ---------- Kelime sözlüğü (istatistiksel hizalama) ----------
// Her İngilizce kelime için, onu içeren cümlelerin Türkçe çevirilerinde en ayırt edici kök (Dice katsayısı).
console.log("Sözlük çıkarılıyor…");
// Özel isimler (Tom, Mary…) Türkçe çevirilerde aynen geçtiği için sözlükten dışlanır
const names = new Map();
for (const p of pairs) for (const m of p.en.matchAll(/(?<=\s)([A-Z][a-z]+)/g)) names.set(m[1].toLowerCase(), (names.get(m[1].toLowerCase()) || 0) + 1);
const nameStems = new Set([...names.entries()].filter(([w, c]) => c >= 30 && !rank.has(w) || (c >= 200 && (rank.get(w) ?? 0) > 300)).map(([w]) => w.slice(0, 4)));
const stem = (t) => t.slice(0, Math.min(t.length, t.length > 6 ? 5 : 4));
const enCount = new Map();
const trCount = new Map();
const co = new Map(); // en → Map(stem → count)
const forms = new Map(); // stem → Map(form → count)
for (const p of pairs) {
  if (p.n > 10) continue;
  const ens = new Set(tokEn(p.en).filter((w) => (rank.get(w) ?? 99999) <= 12000));
  const trs = new Set(tokTr(p.tr).map((t) => {
    const s = stem(t);
    if (!forms.has(s)) forms.set(s, new Map());
    forms.get(s).set(t, (forms.get(s).get(t) || 0) + 1);
    return s;
  }));
  for (const s of trs) trCount.set(s, (trCount.get(s) || 0) + 1);
  for (const w of ens) {
    enCount.set(w, (enCount.get(w) || 0) + 1);
    if (!co.has(w)) co.set(w, new Map());
    const m = co.get(w);
    for (const s of trs) m.set(s, (m.get(s) || 0) + 1);
  }
}
const gloss = {};
for (const [w, m] of co) {
  const cw = enCount.get(w);
  if (cw < 4) continue;
  let best = null;
  let bestScore = 0;
  for (const [s, c] of m) {
    if (c < 3 || nameStems.has(s.slice(0, 4))) continue;
    const dice = (2 * c) / (cw + trCount.get(s));
    if (dice > bestScore) {
      bestScore = dice;
      best = s;
    }
  }
  if (!best || bestScore < 0.25) continue;
  // En sık biçimlerden en kısası (ör. "evin" yerine "ev")
  const fm = [...forms.get(best).entries()].sort((a, b) => b[1] - a[1]);
  const top = fm.filter(([, c]) => c >= fm[0][1] * 0.25).sort((a, b) => a[0].length - b[0].length);
  gloss[w] = [top[0][0], Math.round(bestScore * 100)];
}
console.log(`  ${Object.keys(gloss).length} kelime`);
writeFileSync(path.join(out, "gloss-en-tr.json.gz"), gzipSync(JSON.stringify(gloss)));
console.log("Bitti →", out);
