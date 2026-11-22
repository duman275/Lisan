// Video: cihazda saklama (OPFS, 2 GB'a kadar), Gemini ile altyazı çıkarma, çeviri, SRT/VTT.
import { z } from "zod";
import { llmJson } from "./browserLLM";
import { getSettings } from "./store";

export const MAX_VIDEO = 2 * 1024 * 1024 * 1024; // 2 GB
const GEMINI = "https://generativelanguage.googleapis.com";

export interface Cue {
  s: number; // başlangıç (sn)
  e: number; // bitiş (sn)
  t: string;
}

export interface VideoMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  duration: number;
  added: number;
  spokenLang?: string; // videoda konuşulan dil (ISO)
  subs: Record<string, Cue[]>; // dil adı → altyazılar ("Orijinal", "Türkçe", "English"…)
  gemini?: { name: string; uri: string; mime: string; expires: number };
  /** Bağlantıdan eklenen video: YouTube (gömülü oynatılır) ya da doğrudan dosya bağlantısı */
  source?:
    | { kind: "youtube"; url: string; videoId: string }
    | { kind: "url"; url: string }
    /** İndirilemeyen ama oynatılabilen uzak video (ör. X/Twitter videosu) */
    | { kind: "remote"; url: string; page?: string };
}

/** YouTube bağlantısından video kimliğini çıkarır (watch, youtu.be, shorts, embed, live). */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = /^\/(shorts|embed|live|v)\/([\w-]{6,})/.exec(u.pathname);
      if (m) return m[2];
    }
  } catch {
    /* geçersiz bağlantı */
  }
  return null;
}

/** X (Twitter) gönderi bağlantısından gönderi kimliğini çıkarır. */
export function xStatusId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|mobile|m)\./, "");
    if (!/^(x\.com|twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com|fixvx\.com|twittpr\.com)$/.test(host)) return null;
    return /\/status(?:es)?\/(\d+)/.exec(u.pathname)?.[1] || null;
  } catch {
    return null;
  }
}

export interface XVideo {
  url: string;
  text: string;
  author: string;
}

/** X gönderisindeki videonun .mp4 adresini bulur (açık FixTweet / vxTwitter servisleri üzerinden). */
export async function resolveXVideo(id: string): Promise<XVideo> {
  const errs: string[] = [];
  // 1) FixTweet
  try {
    const r = await fetch(`https://api.fxtwitter.com/status/${id}`);
    if (r.ok) {
      const d = (await r.json()) as {
        tweet?: { text?: string; author?: { screen_name?: string }; media?: { videos?: { url: string; width?: number }[] } };
      };
      const vids = d.tweet?.media?.videos || [];
      if (vids.length) return { url: vids[0].url, text: d.tweet?.text || "", author: d.tweet?.author?.screen_name || "" };
      errs.push("gönderide video yok");
    } else errs.push(`FixTweet ${r.status}`);
  } catch {
    errs.push("FixTweet erişilemedi");
  }
  // 2) vxTwitter
  try {
    const r = await fetch(`https://api.vxtwitter.com/Twitter/status/${id}`);
    if (r.ok) {
      const d = (await r.json()) as { text?: string; user_screen_name?: string; media_extended?: { type: string; url: string }[]; mediaURLs?: string[] };
      const v = (d.media_extended || []).find((m) => m.type === "video" || m.type === "gif") || (d.mediaURLs || []).map((u) => ({ url: u })).find((m) => /\.mp4/.test(m.url));
      if (v) return { url: v.url, text: d.text || "", author: d.user_screen_name || "" };
      errs.push("gönderide video yok");
    } else errs.push(`vxTwitter ${r.status}`);
  } catch {
    errs.push("vxTwitter erişilemedi");
  }
  throw new Error(
    errs.includes("gönderide video yok")
      ? "Bu X gönderisinde video bulunamadı (yalnızca fotoğraf ya da metin olabilir)."
      : `X videosunun adresi alınamadı (${errs.join(", ")}). Gönderi gizli/korumalı ya da silinmiş olabilir.`,
  );
}

/** Paylaşım bağlantılarını doğrudan indirilebilir biçime çevirir (Dropbox, Google Drive). */
export function normalizeVideoUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (/(^|\.)dropbox\.com$/.test(u.hostname)) {
      u.searchParams.delete("dl");
      u.searchParams.set("raw", "1");
      return u.toString();
    }
    if (u.hostname === "drive.google.com") {
      const id = /\/file\/d\/([\w-]+)/.exec(u.pathname)?.[1] || u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Doğrudan video bağlantısını akış hâlinde telefona indirir (site izin veriyorsa). */
export async function downloadVideoUrl(id: string, url: string, onProgress: (msg: string) => void, signal?: AbortSignal): Promise<{ name: string; size: number; type: string }> {
  let r: Response;
  try {
    r = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Bu site videonun uygulama içinden indirilmesine izin vermiyor. Videoyu telefona indirip “Video seç” ile ekleyebilirsin; YouTube bağlantıları ise doğrudan eklenebilir.");
  }
  if (!r.ok || !r.body) throw new Error(`Video indirilemedi (${r.status}).`);
  const type = (r.headers.get("content-type") || "").split(";")[0];
  if (type && !/^(video|audio)\/|octet-stream/.test(type)) throw new Error(`Bu bağlantı bir video dosyası değil (${type}). Sayfa bağlantısı yerine doğrudan .mp4/.webm bağlantısı gerekir; YouTube bağlantıları ise doğrudan eklenebilir.`);
  const total = Number(r.headers.get("content-length")) || 0;
  if (total > MAX_VIDEO) throw new Error(`Video ${fmtSize(total)} — en fazla 2 GB indirilebilir.`);
  await navigator.storage.persist?.().catch(() => false);
  const fh = await (await dir()).getFileHandle(id, { create: true });
  const w = await fh.createWritable();
  const reader = r.body.getReader();
  let got = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      got += value.byteLength;
      if (got > MAX_VIDEO) throw new Error("Video 2 GB'ı aştı, indirme durduruldu.");
      await w.write(value);
      onProgress(total ? `İndiriliyor… %${Math.round((got / total) * 100)} (${fmtSize(got)} / ${fmtSize(total)})` : `İndiriliyor… ${fmtSize(got)}`);
    }
    await w.close();
  } catch (e) {
    await w.abort().catch(() => {});
    await deleteVideoFile(id);
    throw e;
  }
  let name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "") || "video";
  if (!/\.\w{2,4}$/.test(name)) name += type.includes("webm") ? ".webm" : ".mp4";
  return { name, size: got, type: type || "video/mp4" };
}

// ---------- Cihazda saklama (Origin Private File System) ----------

async function dir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle("videos", { create: true });
}

export async function saveVideoFile(id: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  await navigator.storage.persist?.().catch(() => false);
  const est = await navigator.storage.estimate?.().catch(() => undefined);
  if (est?.quota && est.usage !== undefined && est.quota - est.usage < file.size * 1.05)
    throw new Error(`Telefonda yeterli yer yok (gereken ${fmtSize(file.size)}, boş ${fmtSize(est.quota - est.usage)}).`);
  const fh = await (await dir()).getFileHandle(id, { create: true });
  const w = await fh.createWritable();
  // Akış hâlinde kopyala (2 GB dosya belleğe alınmaz)
  const reader = file.stream().getReader();
  let done = 0;
  try {
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      await w.write(value);
      done += value.byteLength;
      onProgress?.(Math.round((done / file.size) * 100));
    }
    await w.close();
  } catch (e) {
    await w.abort().catch(() => {});
    throw e;
  }
}

export async function loadVideoFile(id: string): Promise<File | null> {
  try {
    return await (await (await dir()).getFileHandle(id)).getFile();
  } catch {
    return null;
  }
}

export async function deleteVideoFile(id: string) {
  await (await dir()).removeEntry(id).catch(() => {});
}

export function fmtSize(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- Gemini Files API (2 GB'a kadar) ----------

function geminiKey(): string {
  const s = getSettings();
  if (!s.llmKey || !s.llmBaseUrl.includes("generativelanguage.googleapis.com"))
    throw new Error("Altyazı çıkarmak için Ayarlar → “Telefonda yapay zekâ” bölümünde Google Gemini anahtarı gerekli.");
  return s.llmKey;
}

const GEMINI_MODELS = () => {
  const s = getSettings();
  const pref = s.llmBaseUrl.includes("generativelanguage") && s.llmModel ? [s.llmModel] : [];
  return [...new Set([...pref, "gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"])];
};

async function gfetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-goog-api-key", geminiKey());
  const r = await fetch(url, { ...init, headers });
  return r;
}

async function gerror(r: Response) {
  const t = await r.text();
  let msg = t.slice(0, 300);
  try {
    msg = JSON.parse(t).error?.message || msg;
  } catch {
    /* düz metin */
  }
  if (r.status === 401 || r.status === 403) return new Error(`Gemini anahtarı reddedildi: ${msg}`);
  if (r.status === 429) return new Error(`Gemini ücretsiz kullanım sınırı doldu, biraz sonra tekrar dene. (${msg})`);
  return new Error(`Gemini hatası (${r.status}): ${msg}`);
}

/** Videoyu parça parça (16 MB) Gemini'ye yükler; 48 saat saklanır. */
export async function uploadToGemini(file: File, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<{ name: string; uri: string; mime: string }> {
  if (file.size > MAX_VIDEO) throw new Error("Video 2 GB'tan büyük.");
  const mime = file.type || "video/mp4";
  const start = await gfetch(`${GEMINI}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: file.name.slice(0, 100) } }),
    signal,
  });
  if (!start.ok) throw await gerror(start);
  const id = start.headers.get("x-guploader-uploadid");
  const uploadUrl = start.headers.get("x-goog-upload-url") || (id ? `${GEMINI}/upload/v1beta/files?upload_id=${encodeURIComponent(id)}&upload_protocol=resumable` : "");
  if (!uploadUrl) throw new Error("Gemini yükleme adresi alınamadı.");

  const CH = 16 * 1024 * 1024;
  let offset = 0;
  let result: { file?: { name: string; uri: string; mimeType: string } } = {};
  while (offset < file.size) {
    const end = Math.min(offset + CH, file.size);
    const last = end >= file.size;
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      try {
        const r = await fetch(uploadUrl, {
          method: "POST",
          headers: { "X-Goog-Upload-Command": last ? "upload, finalize" : "upload", "X-Goog-Upload-Offset": String(offset) },
          body: file.slice(offset, end),
          signal,
        });
        if (!r.ok) throw await gerror(r);
        if (last) result = await r.json();
        ok = true;
      } catch (e) {
        if ((e as Error).name === "AbortError" || attempt === 3) throw e;
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      }
    }
    offset = end;
    onProgress(Math.round((offset / file.size) * 100));
  }
  if (!result.file) throw new Error("Gemini yüklemeyi tamamlamadı.");
  // İşlenmesini bekle
  for (let i = 0; i < 180; i++) {
    const r = await gfetch(`${GEMINI}/v1beta/${result.file.name}`, { signal });
    if (!r.ok) throw await gerror(r);
    const f = (await r.json()) as { state?: string; error?: { message?: string } };
    if (f.state === "ACTIVE") break;
    if (f.state === "FAILED") throw new Error(`Gemini videoyu işleyemedi: ${f.error?.message || ""}`);
    await new Promise((res) => setTimeout(res, 5000));
  }
  return { name: result.file.name, uri: result.file.uri, mime: result.file.mimeType || mime };
}

const SEG = 15 * 60; // her istekte 15 dakika

/** Videodaki konuşmayı zaman damgalı altyazıya çevirir (15 dakikalık bölümlerle). */
export async function transcribe(
  file: { uri: string; mime: string },
  duration: number,
  onProgress: (msg: string, cues: Cue[]) => void,
  signal?: AbortSignal,
): Promise<{ lang: string; cues: Cue[] }> {
  const all: Cue[] = [];
  let lang = "";
  const total = Math.max(1, Math.ceil((duration || SEG) / SEG));
  for (let k = 0; k < total; k++) {
    const a = k * SEG;
    const b = Math.min(duration || (k + 1) * SEG, (k + 1) * SEG);
    onProgress(`Altyazı çıkarılıyor: ${fmtTime(a)}–${fmtTime(b)} (${k + 1}/${total})`, all);
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { fileData: file.mime ? { mimeType: file.mime, fileUri: file.uri } : { fileUri: file.uri }, ...(duration ? { videoMetadata: { startOffset: `${a}s`, endOffset: `${b}s` } } : {}) },
            {
              text: `Transcribe ALL speech in this part of the video (from ${a} to ${b} seconds of the full video) verbatim, in the original spoken language (do not translate). Return subtitle cues: "s" = start time and "e" = end time in seconds measured from the BEGINNING OF THE FULL VIDEO, "t" = text (max ~84 characters, split longer sentences). Include song lyrics if sung. "lang" = ISO 639-1 code of the main spoken language. If there is no speech, return an empty cues array.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            lang: { type: "STRING" },
            cues: { type: "ARRAY", items: { type: "OBJECT", properties: { s: { type: "NUMBER" }, e: { type: "NUMBER" }, t: { type: "STRING" } }, required: ["s", "e", "t"] } },
          },
          required: ["lang", "cues"],
        },
        mediaResolution: "MEDIA_RESOLUTION_LOW",
        maxOutputTokens: 65536,
      },
    };
    let data: { lang?: string; cues?: Cue[] } | null = null;
    let lastErr: Error | null = null;
    for (const model of GEMINI_MODELS()) {
      const r = await gfetch(`${GEMINI}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!r.ok) {
        lastErr = await gerror(r);
        if ([404, 429, 503].includes(r.status)) continue;
        throw lastErr;
      }
      const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = new Error("Gemini geçerli altyazı üretmedi.");
        continue;
      }
      break;
    }
    if (!data) throw lastErr || new Error("Altyazı çıkarılamadı.");
    let cues = (data.cues || []).filter((c) => c.t?.trim() && Number.isFinite(c.s) && Number.isFinite(c.e));
    // Model zamanları bölüm başından ölçtüyse kaydır
    if (a > 0 && cues.length && cues[0].s < a - 5 && Math.max(...cues.map((c) => c.e)) <= b - a + 10) cues = cues.map((c) => ({ ...c, s: c.s + a, e: c.e + a }));
    for (const c of cues) if (c.e <= c.s) c.e = c.s + Math.max(1.5, c.t.length / 15);
    all.push(...cues);
    lang ||= data.lang || "";
  }
  all.sort((x, y) => x.s - y.s);
  return { lang, cues: all };
}

/** Altyazıları başka dile çevirir (yapay zekâ ile, 120'şer satırlık parçalar). */
export async function translateCues(cues: Cue[], targetLang: string, onProgress: (done: number) => void): Promise<Cue[]> {
  const out: Cue[] = [];
  const N = 120;
  for (let i = 0; i < cues.length; i += N) {
    const part = cues.slice(i, i + N);
    const schema = z.object({ lines: z.array(z.string()) });
    const r = await llmJson(
      "You are a professional subtitle translator. Translate each subtitle line naturally and concisely (subtitles must stay short and readable), keeping the same number of lines in the same order. Keep names. Use context from neighbouring lines.",
      `Translate these ${part.length} subtitle lines into ${targetLang}. Return {"lines": [...]} with exactly ${part.length} items.\n\n${part.map((c, k) => `${k + 1}. ${c.t}`).join("\n")}`,
      schema,
    );
    part.forEach((c, k) => out.push({ ...c, t: (r.lines[k] || c.t).replace(/^\d+\.\s*/, "") }));
    onProgress(Math.min(cues.length, i + N));
  }
  return out;
}

// ---------- SRT / VTT ----------

const ts = (sec: number, sep: "," | ".") => {
  const ms = Math.round((sec % 1) * 1000);
  const t = Math.floor(sec);
  return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
};

export function toSrt(cues: Cue[]) {
  return cues.map((c, i) => `${i + 1}\n${ts(c.s, ",")} --> ${ts(c.e, ",")}\n${c.t}\n`).join("\n");
}

export function toVtt(cues: Cue[]) {
  return "WEBVTT\n\n" + cues.map((c) => `${ts(c.s, ".")} --> ${ts(c.e, ".")}\n${c.t}\n`).join("\n");
}

export function parseSubs(text: string): Cue[] {
  const cues: Cue[] = [];
  const toSec = (x: string) => {
    const m = /(?:(\d+):)?(\d+):(\d+)[.,](\d+)/.exec(x.trim());
    if (!m) return NaN;
    return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, "0").slice(0, 3)) / 1000;
  };
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() && l.trim() !== "WEBVTT");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->");
    const t = lines
      .slice(i + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    const s = toSec(a);
    const e = toSec(b);
    if (t && Number.isFinite(s) && Number.isFinite(e)) cues.push({ s, e, t });
  }
  return cues;
}

export function cueAt(cues: Cue[] | undefined, time: number): number {
  if (!cues?.length) return -1;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].e < time) lo = mid + 1;
    else if (cues[mid].s > time) hi = mid - 1;
    else return mid;
  }
  return -1;
}
