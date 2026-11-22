// Uzun/büyük videoların sesini telefonda parçalara ayırır (ffmpeg.wasm).
// Dosya belleğe kopyalanmaz (WORKERFS): 2 GB'lık videolar da çalışır.
import type { FFmpeg } from "@ffmpeg/ffmpeg";

const CORE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
let ff: Promise<FFmpeg> | null = null;
let mounted: File | null = null;

async function blobUrl(url: string, type: string, onProgress?: (pct: number) => void): Promise<string> {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Ses aracı indirilemedi (${r.status})`);
  const total = Number(r.headers.get("content-length") || 0);
  const reader = r.body.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (total) onProgress?.(Math.round((got / total) * 100));
  }
  return URL.createObjectURL(new Blob(parts as BlobPart[], { type }));
}

function load(onProgress?: (msg: string) => void): Promise<FFmpeg> {
  ff ??= (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const f = new FFmpeg();
    onProgress?.("Ses aracı hazırlanıyor (bir kez, ~30 MB)…");
    const [coreURL, wasmURL] = await Promise.all([
      blobUrl(`${CORE}/ffmpeg-core.js`, "text/javascript"),
      blobUrl(`${CORE}/ffmpeg-core.wasm`, "application/wasm", (p) => onProgress?.(`Ses aracı indiriliyor… %${p} (bir kez)`)),
    ]);
    await f.load({ coreURL, wasmURL });
    return f;
  })().catch((e) => {
    ff = null;
    throw e;
  });
  return ff;
}

/** Videonun [start, start+len) saniyelik sesini küçük bir mp3 olarak verir (16 kHz mono). */
export async function audioChunk(file: File, start: number, len: number, onProgress?: (msg: string) => void): Promise<Uint8Array> {
  const f = await load(onProgress);
  if (mounted !== file) {
    if (mounted) await f.unmount("/in").catch(() => {});
    await f.createDir("/in").catch(() => {});
    await f.mount("WORKERFS" as never, { files: [file] }, "/in");
    mounted = file;
  }
  const out = `/c${Math.round(start)}.mp3`;
  const code = await f.exec(["-ss", String(start), "-t", String(len), "-i", `/in/${file.name}`, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", "-f", "mp3", out]);
  if (code !== 0) throw new Error("Videonun sesi okunamadı (desteklenmeyen biçim olabilir).");
  const data = (await f.readFile(out)) as Uint8Array;
  await f.deleteFile(out).catch(() => {});
  return data;
}

export function toBase64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
