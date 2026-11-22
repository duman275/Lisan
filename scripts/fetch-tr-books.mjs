#!/usr/bin/env node
// Telif süresi dolmuş Türkçe klasikleri Vikikaynak'tan (tr.wikisource.org, CC BY-SA / kamu malı) indirir.
// Çıktı: public/books/tr-<slug>.json.gz ve public/books/tr-index.json (uygulama bu listeyi gösterir).
// Kullanım: node scripts/fetch-tr-books.mjs   (GitHub Actions derlemesinde otomatik çalışır)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/books");
mkdirSync(out, { recursive: true });
const API = "https://tr.wikisource.org/w/api.php";
const UA = { "User-Agent": "Lisan-build/1.0 (open-source language learning app; https://github.com/duman275/Lisan)" };

// Yazarı 1955'ten önce ölmüş (Türkiye'de ölümden 70 yıl sonra kamu malı) eserler
const CANDIDATES = [
  ["Kürk Mantolu Madonna", "Sabahattin Ali"],
  ["Kuyucaklı Yusuf", "Sabahattin Ali"],
  ["İçimizdeki Şeytan", "Sabahattin Ali"],
  ["Aşk-ı Memnu", "Halit Ziya Uşaklıgil"],
  ["Mai ve Siyah", "Halit Ziya Uşaklıgil"],
  ["İntibah", "Namık Kemal"],
  ["Cezmi", "Namık Kemal"],
  ["Araba Sevdası", "Recaizade Mahmut Ekrem"],
  ["Felatun Bey ile Rakım Efendi", "Ahmet Mithat Efendi"],
  ["Eylül", "Mehmet Rauf"],
  ["Şıpsevdi", "Hüseyin Rahmi Gürpınar"],
  ["Mürebbiye", "Hüseyin Rahmi Gürpınar"],
  ["Taaşşuk-ı Talat ve Fitnat", "Şemsettin Sami"],
  ["Safahat", "Mehmet Akif Ersoy"],
  ["Kaşağı", "Ömer Seyfettin"],
  ["Forsa", "Ömer Seyfettin"],
  ["Pembe İncili Kaftan", "Ömer Seyfettin"],
  ["Diyet", "Ömer Seyfettin"],
  ["Yüksek Ökçeler", "Ömer Seyfettin"],
  ["Bomba", "Ömer Seyfettin"],
  ["Falaka", "Ömer Seyfettin"],
  ["Semaver", "Sait Faik Abasıyanık"],
  ["Sarnıç", "Sait Faik Abasıyanık"],
  ["Rübab-ı Şikeste", "Tevfik Fikret"],
];

const slug = (s) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function api(params) {
  const u = new URL(API);
  u.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function htmlToText(html) {
  return html
    .replace(/<(script|style|table|sup|nav|figure)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<div[^>]*class="[^"]*(ws-noexport|noprint|mw-references|reflist|navbox|ws-header)[^"]*"[\s\S]*?<\/div>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|dd|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[\d+\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pageText(title) {
  const d = await api({ action: "parse", page: title, prop: "text", redirects: "1" });
  return d.parse?.text ? htmlToText(d.parse.text) : "";
}

async function findTitle(name, author) {
  // Önce tam başlık, sonra arama
  const exact = await api({ action: "query", titles: name, redirects: "1" });
  const p = exact.query?.pages?.[0];
  if (p && !p.missing) return p.title;
  const s = await api({ action: "query", list: "search", srsearch: `${name} ${author}`, srlimit: "5", srnamespace: "0" });
  const hit = (s.query?.search || []).find((x) => x.title.toLocaleLowerCase("tr").includes(name.toLocaleLowerCase("tr").slice(0, 6)));
  return hit?.title || null;
}

const index = existsSync(path.join(out, "tr-index.json")) ? JSON.parse(readFileSync(path.join(out, "tr-index.json"), "utf8")) : [];
const have = new Set(index.map((b) => b.id));
for (const [name, author] of CANDIDATES) {
  const id = `tr-${slug(name)}`;
  if (have.has(id) && existsSync(path.join(out, `${id}.json.gz`))) continue;
  try {
    const title = await findTitle(name, author);
    if (!title) {
      console.log(`  ✗ ${name}: Vikikaynak'ta bulunamadı`);
      continue;
    }
    // Alt sayfalar (bölümler) varsa sırayla birleştir
    const sub = await api({ action: "query", list: "allpages", apprefix: `${title}/`, apnamespace: "0", aplimit: "500" });
    const subs = (sub.query?.allpages || []).map((x) => x.title);
    subs.sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
    let text = "";
    if (subs.length) {
      for (const t of subs.slice(0, 120)) {
        const part = await pageText(t);
        if (part) text += `\n\n${t.slice(title.length + 1)}\n\n${part}`;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    const main = await pageText(title);
    if (main.length > text.length * 0.5) text = main + text;
    text = text.trim();
    if (text.length < 3000) {
      console.log(`  ✗ ${name}: metin çok kısa (${text.length} karakter, “${title}”, ${subs.length} alt sayfa)`);
      continue;
    }
    writeFileSync(path.join(out, `${id}.json.gz`), gzipSync(JSON.stringify({ title: name, author, lang: "tr", text })));
    index.push({ id, title: name, author, chars: text.length, source: `https://tr.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` });
    have.add(id);
    console.log(`  ✓ ${name} — ${author} (${Math.round(text.length / 1000)}K karakter, ${subs.length} bölüm)`);
  } catch (e) {
    console.log(`  … ${name}: ${e.message}`);
  }
}
writeFileSync(path.join(out, "tr-index.json"), JSON.stringify(index, null, 1));
console.log(`${index.length} Türkçe tam kitap hazır`);
