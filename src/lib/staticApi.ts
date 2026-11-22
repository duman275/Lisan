// Sunucusuz (statik) mod: GitHub Pages gibi yerlerde, telefondan doğrudan çalışır.
// Ücretsiz motor tarayıcıda çalışır; veriler sitenin data/ ve books/ klasörlerinden okunur.
import { freeJsonTask, freeReady, initFreeData, NEEDS_LLM, wikiText } from "../../shared/freeCore";

const BASE = import.meta.env.BASE_URL;

/** .gz dosyasını indirip açar (sunucu zaten açtıysa olduğu gibi döner). */
async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`İndirilemedi (${r.status}): ${url}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return new TextDecoder().decode(buf);
}

let loading: Promise<void> | null = null;
export function ensureFreeData(): Promise<void> {
  if (freeReady()) return Promise.resolve();
  loading ??= (async () => {
    const [pairsTsv, glossJson, freqEnTxt] = await Promise.all([
      fetchText(`${BASE}data/en-tr.tsv.gz`),
      fetchText(`${BASE}data/gloss-en-tr.json.gz`),
      fetchText(`${BASE}data/freq-en.txt.gz`),
    ]);
    initFreeData({ pairsTsv, glossJson, freqEnTxt });
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export async function staticJson(body: Record<string, unknown>): Promise<unknown> {
  await ensureFreeData();
  return freeJsonTask(body as unknown as Parameters<typeof freeJsonTask>[0]);
}

export async function staticStream(
  body: Record<string, unknown>,
  h: { onText?: (chunk: string, full: string) => void; onStatus?: (t: string) => void; onSource?: (s: { url: string; title: string }) => void },
) {
  const task = body.task as string;
  const title = body.title as string | undefined;
  if ((task === "summary" || task === "analysis") && title && !(body.text as string | undefined)?.trim()) {
    h.onStatus?.("Wikipedia'dan derleniyor…");
    const r = await wikiText(task, title, body.author as string | undefined);
    r.sources.forEach((s) => h.onSource?.(s));
    let full = "";
    for (const part of r.text.split(/(?<=\n\n)/)) {
      full += part;
      h.onText?.(part, full);
    }
    return { text: full, sources: r.sources };
  }
  throw new Error(
    "Bu özellik bir dil modeli gerektirir ve telefondaki (sunucusuz) sürümde yok. İngilizce dersler, kartlar, seviye testi, sözlük, özet ve analiz ücretsiz çalışır.",
  );
}

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string }[];
  languages: string[];
  download_count: number;
  formats: Record<string, string>;
}

export async function staticGet(url: string): Promise<unknown> {
  if (url.startsWith("/api/health")) {
    return {
      ok: true,
      ai: true,
      llm: false,
      free: true,
      static: true,
      agent: { claude: false, ollama: false, ollamaModel: "", ollamaModels: [] },
    };
  }
  const text = /^\/api\/books\/(\d+)\/text/.exec(url);
  if (text) {
    // Katalogdaki telifsiz kitaplar siteyle birlikte gelir
    try {
      return JSON.parse(await fetchText(`${BASE}books/${text[1]}.json.gz`));
    } catch {
      throw new Error("Bu kitap telefondaki sürüme eklenmemiş. Efsaneler sekmesindeki 📗 işaretli kitaplar açılabilir; ya da PDF/metin yükleyebilirsin.");
    }
  }
  if (url.startsWith("/api/books/search")) {
    const q = new URL(url, location.origin).searchParams.get("q") || "";
    let r: Response;
    try {
      r = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(q)}`);
    } catch {
      throw new Error("Gutenberg araması telefondan yapılamadı. Efsaneler sekmesindeki 📗 kitaplar doğrudan açılabilir.");
    }
    const d = (await r.json()) as { results: GutendexBook[] };
    return d.results.slice(0, 24).map((b) => ({
      id: b.id,
      title: b.title,
      authors: b.authors.map((a) => a.name),
      languages: b.languages,
      downloads: b.download_count,
      hasText: true,
    }));
  }
  throw new Error(NEEDS_LLM);
}
