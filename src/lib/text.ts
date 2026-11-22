export interface Sentence {
  text: string;
  para: number;
}

const MAX = 260; // çok uzun cümleler tarayıcı seslendirmesinde kesilebildiği için bölünür

function splitLong(s: string): string[] {
  if (s.length <= MAX) return [s];
  const parts: string[] = [];
  let rest = s;
  while (rest.length > MAX) {
    const slice = rest.slice(0, MAX);
    let cut = Math.max(slice.lastIndexOf(", "), slice.lastIndexOf("; "), slice.lastIndexOf(": "), slice.lastIndexOf("، "), slice.lastIndexOf("、"));
    if (cut < MAX * 0.4) cut = slice.lastIndexOf(" ");
    if (cut <= 0) cut = MAX;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) parts.push(rest.trim());
  return parts;
}

export function splitSentences(text: string, lang = "en"): Sentence[] {
  const paras = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const out: Sentence[] = [];
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const seg = Seg ? new Seg(lang.slice(0, 2), { granularity: "sentence" }) : null;
  paras.forEach((p, i) => {
    const sentences = seg
      ? Array.from(seg.segment(p), (x) => x.segment.trim()).filter(Boolean)
      : p.match(/[^.!?。！？]+[.!?。！？]+["'”’)]*|\S[^.!?。！？]*$/g) || [p];
    for (const s of sentences) for (const part of splitLong(s)) out.push({ text: part, para: i });
  });
  return out;
}

/** Markdown işaretlerini seslendirme için temizler. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/^\s*---+\s*$/gm, "")
    .trim();
}

export function wordCount(t: string) {
  return (t.match(/\S+/g) || []).length;
}

export function minutes(t: string, wpm = 160) {
  return Math.max(1, Math.round(wordCount(t) / wpm));
}

/** Metni yaklaşık karakter sınırına göre bölümlere ayırır (paragraf sınırlarında). */
export function chunkText(text: string, size = 12_000): string[] {
  const paras = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur.length + p.length > size && cur) {
      chunks.push(cur);
      cur = "";
    }
    cur += (cur ? "\n\n" : "") + p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean);
  const x = norm(a);
  const y = norm(b);
  if (!x.length || !y.length) return 0;
  // Kelime düzeyinde en uzun ortak alt dizi
  const dp = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[x.length][y.length] / Math.max(x.length, y.length);
}
