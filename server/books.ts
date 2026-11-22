// Telifsiz (kamu malı) kitaplar: Project Gutenberg kataloğu (Gutendex API üzerinden).

const GUTENDEX = "https://gutendex.com/books";

export interface BookHit {
  id: number;
  title: string;
  authors: string[];
  languages: string[];
  downloads: number;
  hasText: boolean;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string }[];
  languages: string[];
  download_count: number;
  formats: Record<string, string>;
}

function textUrl(b: GutendexBook): string | undefined {
  const keys = Object.keys(b.formats);
  const k =
    keys.find((x) => x.startsWith("text/plain") && x.includes("utf-8")) ||
    keys.find((x) => x.startsWith("text/plain"));
  return k ? b.formats[k] : undefined;
}

export async function searchBooks(q: string, lang?: string): Promise<BookHit[]> {
  const url = new URL(GUTENDEX);
  url.searchParams.set("search", q);
  if (lang) url.searchParams.set("languages", lang);
  const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Gutenberg araması başarısız (${r.status})`);
  const data = (await r.json()) as { results: GutendexBook[] };
  return data.results.slice(0, 24).map((b) => ({
    id: b.id,
    title: b.title,
    authors: b.authors.map((a) => a.name),
    languages: b.languages,
    downloads: b.download_count,
    hasText: Boolean(textUrl(b)),
  }));
}

const cache = new Map<number, { title: string; author: string; lang: string; text: string }>();

export async function bookText(id: number) {
  const hit = cache.get(id);
  if (hit) return hit;
  let out: { title: string; author: string; lang: string; text: string };
  try {
    const r = await fetch(`${GUTENDEX}/${id}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`Kitap bulunamadı (${r.status})`);
    const b = (await r.json()) as GutendexBook;
    const url = textUrl(b);
    if (!url) throw new Error("Bu kitabın düz metin sürümü yok");
    out = {
      title: b.title,
      author: b.authors.map((a) => a.name).join(", "),
      lang: b.languages[0] || "en",
      text: stripGutenberg(await download(url)),
    };
  } catch (err) {
    // Gutendex erişilemezse doğrudan Project Gutenberg önbelleğinden indir
    const raw = await download(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`).catch(() => {
      throw err;
    });
    out = {
      title: /^Title:\s*(.+)$/m.exec(raw)?.[1]?.trim() || `Gutenberg #${id}`,
      author: /^Author:\s*(.+)$/m.exec(raw)?.[1]?.trim() || "",
      lang: langCode(/^Language:\s*(.+)$/m.exec(raw)?.[1]?.trim()),
      text: stripGutenberg(raw),
    };
  }
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  cache.set(id, out);
  return out;
}

async function download(url: string): Promise<string> {
  const t = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!t.ok) throw new Error(`Metin indirilemedi (${t.status})`);
  return t.text();
}

function langCode(name?: string): string {
  const map: Record<string, string> = { English: "en", German: "de", French: "fr", Spanish: "es", Italian: "it", Portuguese: "pt", Russian: "ru", Dutch: "nl", Finnish: "fi", Chinese: "zh", Japanese: "ja" };
  return (name && map[name]) || "en";
}

// Gutenberg lisans başlık/son notlarını ayıklar.
export function stripGutenberg(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n");
  const start = t.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (start >= 0) t = t.slice(t.indexOf("\n", start) + 1);
  const end = t.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (end >= 0) t = t.slice(0, end);
  return t.trim();
}
