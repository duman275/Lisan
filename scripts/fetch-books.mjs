#!/usr/bin/env node
// Efsaneler kataloğundaki telifsiz (Project Gutenberg) kitapları indirip public/books/ altına
// sıkıştırılmış JSON olarak yazar. Sunucusuz (GitHub Pages) sürümde kitaplar buradan okunur.
// Kullanım: node scripts/fetch-books.mjs   (GitHub Actions derlemesinde otomatik çalışır)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/books");
mkdirSync(out, { recursive: true });

const catalog = readFileSync(path.join(root, "src/data/catalog.ts"), "utf8");
const books = [...catalog.matchAll(/\{[^{}]*?title: "([^"]+)"[^{}]*?author: "([^"]+)"[^{}]*?gid: (\d+)[^{}]*?\}/g)].map((m) => ({ title: m[1], author: m[2], gid: Number(m[3]) }));
console.log(`${books.length} telifsiz kitap`);

function strip(raw) {
  let t = raw.replace(/\r\n/g, "\n");
  const s = t.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (s >= 0) t = t.slice(t.indexOf("\n", s) + 1);
  const e = t.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (e >= 0) t = t.slice(0, e);
  return t.trim();
}

const LANG = { English: "en", German: "de", French: "fr", Spanish: "es", Italian: "it", Russian: "ru" };
let ok = 0;
// Engelleyen / yanıt vermeyen aynalar bir kez başarısız olunca bir daha denenmez; toplam süre sınırlı
const badHosts = new Map();
const deadline = Date.now() + 5 * 60_000;
for (const b of books) {
  if (Date.now() > deadline) {
    console.log("Süre doldu; kalan kitaplar atlandı.");
    break;
  }
  const file = path.join(out, `${b.gid}.json.gz`);
  if (existsSync(file)) {
    ok++;
    continue;
  }
  // Resmî site bazen bulut sunucularını engeller; resmî aynalar sırayla denenir
  const urls = [
    `https://www.gutenberg.org/cache/epub/${b.gid}/pg${b.gid}.txt`,
    `https://aleph.gutenberg.org/cache/epub/${b.gid}/pg${b.gid}.txt`,
    `https://gutenberg.pglaf.org/cache/epub/${b.gid}/pg${b.gid}.txt`,
    `https://mirrors.xmission.com/gutenberg/cache/epub/${b.gid}/pg${b.gid}.txt`,
    `https://www.gutenberg.org/files/${b.gid}/${b.gid}-0.txt`,
  ];
  const fails = [];
  for (const u of urls) {
    const host = new URL(u).host;
    if ((badHosts.get(host) || 0) >= 2) continue;
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Lisan-build/1.0; +https://github.com/duman275/Lisan)" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
      if (!r.ok) {
        fails.push(`${host}:${r.status}`);
        if (r.status === 403 || r.status === 429 || r.status >= 500) badHosts.set(host, (badHosts.get(host) || 0) + 1);
        continue;
      }
      const raw = await r.text();
      if (raw.length < 2000 || /<html/i.test(raw.slice(0, 500))) {
        fails.push(`${new URL(u).host}:html`);
        continue;
      }
      const lang = LANG[/^Language:\s*(\w+)/m.exec(raw)?.[1]] || "en";
      writeFileSync(file, gzipSync(JSON.stringify({ title: b.title, author: b.author, lang, text: strip(raw) })));
      ok++;
      console.log(`  ✓ ${b.gid} ${b.title} (${new URL(u).host})`);
      break;
    } catch (e) {
      fails.push(`${host}:${e.cause?.code || e.name}`);
      badHosts.set(host, (badHosts.get(host) || 0) + 1);
    }
  }
  if (!existsSync(file)) console.log(`  ✗ ${b.gid} ${b.title} — ${fails.join(", ")}`);
  await new Promise((r) => setTimeout(r, 300)); // Gutenberg'e nazik ol
}
console.log(`${ok}/${books.length} kitap hazır`);
