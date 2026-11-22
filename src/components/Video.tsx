import { del, get, set } from "idb-keyval";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSettings, uid } from "../lib/store";
import { narrator, findVoice, synthNeural, cancelNeuralBefore, toBcp47 } from "../lib/tts";
import { NEURAL_PREFIX } from "../lib/voices";
import {
  cueAt,
  deleteVideoFile,
  fmtSize,
  fmtTime,
  loadVideoFile,
  MAX_VIDEO,
  parseSubs,
  saveVideoFile,
  toSrt,
  toVtt,
  transcribe,
  transcribeCompat,
  transcribeAudio,
  type Progress,
  fileToDataUrl,
  INLINE_MAX,
  translateCues,
  uploadToGemini,
  downloadVideoUrl,
  normalizeVideoUrl,
  resolveXVideo,
  xStatusId,
  youtubeId,
  type Cue,
  type VideoMeta,
} from "../lib/video";
import { LANGUAGES, langByCode } from "../data/languages";
import { useHealth } from "./common";
import { VoicePicker } from "./VoicePicker";

const META = "video:meta";

function useVideos(): [VideoMeta[], (fn: (v: VideoMeta[]) => VideoMeta[]) => Promise<void>] {
  const [list, setList] = useState<VideoMeta[]>([]);
  useEffect(() => {
    void get<VideoMeta[]>(META).then((v) => setList(v || []));
  }, []);
  const update = async (fn: (v: VideoMeta[]) => VideoMeta[]) => {
    const next = fn((await get<VideoMeta[]>(META)) || []);
    await set(META, next);
    setList(next);
  };
  return [list, update];
}

const label = (key: string, meta?: VideoMeta): string =>
  meta?.partial?.[key] !== undefined
    ? `${label(key)} (yarım${key === "orig" ? "" : " — devam etmek için seç"})`
    : key === "orig" ? `Orijinal${meta?.spokenLang ? ` (${langByCode(toBcp47(meta.spokenLang)).label})` : ""}` : `${langByCode(key).flag} ${langByCode(key).label}`;

// ---------- Oynatıcı soyutlaması: telefondaki video ya da YouTube ----------

interface MediaLike {
  currentTime: number;
  readonly paused: boolean;
  readonly duration: number;
  setVolume(v: number): void;
  on(ev: "pause" | "seeking" | "time", fn: () => void): () => void;
}

class Emitter {
  private fns = new Map<string, Set<() => void>>();
  on(ev: string, fn: () => void) {
    if (!this.fns.has(ev)) this.fns.set(ev, new Set());
    this.fns.get(ev)!.add(fn);
    return () => void this.fns.get(ev)!.delete(fn);
  }
  emit(ev: string) {
    this.fns.get(ev)?.forEach((f) => f());
  }
}

function htmlMedia(v: HTMLVideoElement): MediaLike {
  return {
    get currentTime() {
      return v.currentTime;
    },
    set currentTime(t: number) {
      v.currentTime = t;
    },
    get paused() {
      return v.paused;
    },
    get duration() {
      return Number.isFinite(v.duration) ? v.duration : 0;
    },
    setVolume: (x) => (v.volume = x),
    on(ev, fn) {
      const name = ev === "time" ? "timeupdate" : ev;
      v.addEventListener(name, fn);
      return () => v.removeEventListener(name, fn);
    },
  };
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(s: number, allow: boolean): void;
  setVolume(v: number): void;
  destroy(): void;
}
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };

let ytLoading: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  ytLoading ??= new Promise((resolve, reject) => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT!);
    const sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api";
    sc.onerror = () => reject(new Error("YouTube oynatıcısı yüklenemedi (internet bağlantısını kontrol et)."));
    document.head.appendChild(sc);
  });
  return ytLoading;
}

/** YouTube oynatıcısını MediaLike olarak sarar (zaman, duraklatma ve atlama takibi). */
function youtubeMedia(player: YTPlayer, em: Emitter): MediaLike & { dispose(): void } {
  let lastT = 0;
  let lastAt = performance.now();
  const timer = window.setInterval(() => {
    const t = player.getCurrentTime?.() ?? 0;
    const now = performance.now();
    const expected = lastT + (player.getPlayerState?.() === 1 ? (now - lastAt) / 1000 : 0);
    if (Math.abs(t - expected) > 1.5) em.emit("seeking");
    lastT = t;
    lastAt = now;
    em.emit("time");
  }, 250);
  return {
    get currentTime() {
      return player.getCurrentTime?.() ?? 0;
    },
    set currentTime(t: number) {
      player.seekTo(t, true);
      em.emit("seeking");
    },
    get paused() {
      return player.getPlayerState?.() !== 1;
    },
    get duration() {
      return player.getDuration?.() || 0;
    },
    setVolume: (x) => player.setVolume?.(Math.round(x * 100)),
    on: (ev, fn) => em.on(ev, fn),
    dispose: () => window.clearInterval(timer),
  };
}

export function VideoTab() {
  const [videos, update] = useVideos();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = videos.find((v) => v.id === openId);
  if (open) return <Player meta={open} update={update} onBack={() => setOpenId(null)} />;
  return <VideoList videos={videos} update={update} onOpen={setOpenId} />;
}

/** Dili bilinmeyen (yüklenen) altyazının dilini kabaca tahmin eder. */
function guessSubLang(cues?: Cue[]): string {
  const t = (cues || []).slice(0, 40).map((c) => c.t).join(" ").toLowerCase();
  if (!t) return "en";
  if (/[\u0400-\u04ff]/.test(t)) return "ru";
  if (/[\u0600-\u06ff]/.test(t)) return "ar";
  if (/[\u3040-\u30ff]/.test(t)) return "ja";
  if (/[\uac00-\ud7af]/.test(t)) return "ko";
  if (/[\u4e00-\u9fff]/.test(t)) return "zh";
  const score = (re: RegExp) => (t.match(re) || []).length;
  const c: [string, number][] = [
    ["tr", score(/[ğışç]|\b(ve|bir|bu|için|ne|çok)\b/g)],
    ["es", score(/[ñ¿¡]|\b(el|los|que|una|por|está)\b/g)],
    ["de", score(/[ß]|\b(der|die|und|das|ist|nicht)\b/g)],
    ["fr", score(/\b(le|les|et|est|une|pour|dans|c'est)\b/g)],
    ["it", score(/\b(il|che|di|non|sono|una|per)\b/g)],
    ["pt", score(/[ãõ]|\b(não|uma|para|com|você)\b/g)],
    ["en", score(/\b(the|and|you|is|that|to|of)\b/g)],
  ];
  c.sort((x, y) => y[1] - x[1]);
  return c[0][1] > 0 ? c[0][0] : "en";
}

function probeDuration(src: string): Promise<number> {
  return new Promise<number>((res) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => res(0);
    setTimeout(() => res(0), 15000);
    v.src = src;
  });
}

function VideoList({ videos, update, onOpen }: { videos: VideoMeta[]; update: ReturnType<typeof useVideos>[1]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const dl = useRef<AbortController | null>(null);

  async function addLink() {
    setErr("");
    // Paylaşım metninin içindeki bağlantıyı al (“Şuna bak https://x.com/…” gibi)
    const url = (/https?:\/\/\S+/i.exec(link.trim())?.[0] || link.trim()).replace(/[)\]}>.,;]+$/, "");
    if (!/^https?:\/\//i.test(url)) return setErr("Geçerli bir bağlantı yapıştır (https://…).");
    if (/^https?:\/\/t\.co\//i.test(url))
      return setErr("Bu kısaltılmış bir t.co bağlantısı. X'te gönderiyi aç → Paylaş → “Bağlantıyı kopyala” ile x.com/…/status/… bağlantısını yapıştır.");
    const id = uid();
    const yt = youtubeId(url);
    if (yt) {
      const meta: VideoMeta = { id, name: `YouTube: ${yt}`, size: 0, type: "youtube", duration: 0, added: Date.now(), subs: {}, source: { kind: "youtube", url: `https://www.youtube.com/watch?v=${yt}`, videoId: yt } };
      // Başlığı al (oEmbed, anahtar gerekmez)
      try {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(meta.source!.url)}`);
        if (r.ok) meta.name = ((await r.json()) as { title?: string }).title || meta.name;
      } catch {
        /* başlık alınamazsa kimlik kalır */
      }
      await update((l) => [meta, ...l]);
      setLink("");
      onOpen(id);
      return;
    }
    const ctrl = new AbortController();
    dl.current = ctrl;
    let fileUrl = normalizeVideoUrl(url);
    let title = "";
    try {
      // X (Twitter) gönderisi: videonun gerçek .mp4 adresini bul
      const xid = xStatusId(url);
      if (xid) {
        setStatus("X gönderisindeki video bulunuyor…");
        const xv = await resolveXVideo(xid);
        fileUrl = xv.url;
        title = `X${xv.author ? ` @${xv.author}` : ""}: ${xv.text.replace(/https?:\/\/\S+/g, "").trim().slice(0, 80) || xid}`;
        try {
          setStatus("X videosu indiriliyor…");
          const f = await downloadVideoUrl(id, fileUrl, setStatus, ctrl.signal);
          const file = await loadVideoFile(id);
          const duration = file ? await probeDuration(URL.createObjectURL(file)) : 0;
          await update((l) => [{ id, name: title, size: f.size, type: f.type, duration, added: Date.now(), subs: {}, source: { kind: "url", url } }, ...l]);
        } catch (e) {
          if ((e as Error).name === "AbortError") throw e;
          // İndirmeye izin verilmezse uzaktan oynat
          setStatus("Video telefondan oynatılacak şekilde ekleniyor…");
          const duration = await probeDuration(fileUrl);
          await update((l) => [
            { id, name: title, size: 0, type: "video/mp4", duration, added: Date.now(), subs: {}, source: { kind: "remote", url: fileUrl, page: url, alts: xv.alts } },
            ...l,
          ]);
        }
        setStatus("");
        setLink("");
        onOpen(id);
        return;
      }
      setStatus("Bağlantıya bağlanılıyor…");
      const f = await downloadVideoUrl(id, fileUrl, setStatus, ctrl.signal);
      const file = await loadVideoFile(id);
      const duration = file
        ? await new Promise<number>((res) => {
            const v = document.createElement("video");
            v.preload = "metadata";
            v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : 0);
            v.onerror = () => res(0);
            v.src = URL.createObjectURL(file);
          })
        : 0;
      await update((l) => [{ id, name: f.name, size: f.size, type: f.type, duration, added: Date.now(), subs: {}, source: { kind: "url", url } }, ...l]);
      setStatus("");
      setLink("");
      onOpen(id);
    } catch (e) {
      setStatus("");
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    }
  }

  async function add(file: File) {
    setErr("");
    if (file.size > MAX_VIDEO) return setErr(`Video ${fmtSize(file.size)} — en fazla 2 GB yüklenebilir.`);
    const id = uid();
    try {
      setStatus("Video telefona kaydediliyor… %0");
      await saveVideoFile(id, file, (p) => setStatus(`Video telefona kaydediliyor… %${p}`));
      const duration = await new Promise<number>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : 0);
        v.onerror = () => res(0);
        v.src = URL.createObjectURL(file);
      });
      const meta: VideoMeta = { id, name: file.name, size: file.size, type: file.type || "video/mp4", duration, added: Date.now(), subs: {} };
      await update((l) => [meta, ...l]);
      setStatus("");
      onOpen(id);
    } catch (e) {
      await deleteVideoFile(id);
      setStatus("");
      setErr((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>🎬 Video: altyazı, çeviri ve dublaj</h2>
        <p className="small">
          2 GB'a kadar videonu yükle: konuşmalar yapay zekâyla (Gemini) <b>zaman damgalı altyazıya</b> çevrilir, istediğin dile <b>çevrilir</b> ve kadın/erkek seslerle{" "}
          <b>dublaj</b> yapılır. Hazır .srt/.vtt altyazı da yükleyebilirsin. Video yalnızca telefonunda saklanır.
        </p>
        <div
          className="dropzone"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void add(f);
          }}
        >
          <input ref={ref} type="file" accept="video/*,audio/*" hidden onChange={(e) => e.target.files?.[0] && add(e.target.files[0])} />
          <div className="big-icon">🎬</div>
          <p>
            <b>Video seç (en fazla 2 GB)</b>
          </p>
          <p className="muted small">MP4, WebM, MOV… Ses dosyası (MP3, M4A) da olur.</p>
        </div>
        <h3 className="mt">🔗 Bağlantıdan ekle</h3>
        <form className="row wrap" onSubmit={(e) => (e.preventDefault(), void addLink())}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="X, YouTube ya da video bağlantısı (.mp4, Dropbox, Drive…)" inputMode="url" />
          <button className="btn primary" disabled={!link.trim() || Boolean(status)}>
            Ekle
          </button>
        </form>
        <p className="muted small">
          <b>X (Twitter):</b> gönderi bağlantısını yapıştır; gönderideki video bulunup telefona indirilir (izin verilmezse uygulamada oynatılır). <b>YouTube:</b> video uygulamada YouTube oynatıcısıyla açılır (indirilmez); altyazı, çeviri, iki satır altyazı ve dublaj yine çalışır — Gemini videoyu doğrudan
          YouTube'dan okur (herkese açık videolar). <b>Doğrudan video bağlantısı:</b> 2 GB'a kadar telefona indirilir (site izin veriyorsa).
        </p>
        {status && (
          <div className="status">
            <span className="spinner" /> {status}
            {dl.current && (
              <button className="btn ghost small" onClick={() => dl.current?.abort()}>
                Durdur
              </button>
            )}
          </div>
        )}
        {err && <div className="error">{err}</div>}
      </div>
      <div className="card">
        <h3>Videolarım ({videos.length})</h3>
        {!videos.length && <p className="muted">Henüz video yok.</p>}
        <div className="lib-list">
          {videos.map((v) => (
            <div key={v.id} className="lib-item">
              <button className="lib-open" onClick={() => onOpen(v.id)}>
                <span className="pill">{v.source?.kind === "youtube" ? "▶ YouTube" : v.source?.kind === "remote" ? "𝕏 uzaktan" : v.source?.kind === "url" ? (xStatusId(v.source.url) ? "𝕏" : "🔗") : "🎬"}</span>
                <strong>{v.name}</strong>
                <span className="muted small">
                  {v.size ? `${fmtSize(v.size)} · ` : ""}
                  {fmtTime(v.duration)} · altyazı: {Object.keys(v.subs).length ? Object.keys(v.subs).map((k) => label(k, v)).join(", ") : "yok"}
                </span>
              </button>
              <button
                className="icon"
                aria-label="Sil"
                onClick={async () => {
                  if (!confirm(`“${v.name}” silinsin mi?`)) return;
                  await deleteVideoFile(v.id);
                  await del(`video:pos:${v.id}`);
                  await update((l) => l.filter((x) => x.id !== v.id));
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function Player({ meta, update, onBack }: { meta: VideoMeta; update: ReturnType<typeof useVideos>[1]; onBack: () => void }) {
  const [settings] = useSettings();
  const health = useHealth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<HTMLDivElement>(null);
  const isYT = meta.source?.kind === "youtube";
  const [src, setSrc] = useState("");
  const [missing, setMissing] = useState(false);
  const altIdx = useRef(0);
  /** Uzak video açılamazsa sıradaki adresi dene */
  const onVideoError = () => {
    if (meta.source?.kind !== "remote") return;
    const alts = meta.source.alts || [];
    if (altIdx.current < alts.length) {
      setSrc(alts[altIdx.current++]);
      return;
    }
    setErr(
      "Bu X videosu oynatılamadı (X videoya erişimi engellemiş ya da gönderi kaldırılmış olabilir). Videoyu X'ten telefona indirip “Video seç” ile ekleyebilirsin.",
    );
  };
  const [media, setMedia] = useState<MediaLike | null>(null);
  const [time, setTime] = useState(0);
  const subsRef = useRef<{ a?: Cue[]; b?: Cue[] }>({});
  const tracks = Object.keys(meta.subs);
  const [sub1, setSub1] = useState<string>(tracks.find((k) => k !== "orig") || tracks[0] || "");
  const [sub2, setSub2] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [target, setTarget] = useState(settings.targetLang === "tr-TR" ? "en-US" : "tr-TR");
  const [dubOn, setDubOn] = useState(false);
  const [dubLang, setDubLang] = useState<string>(tracks.find((k) => k !== "orig") || "");
  const [origVol, setOrigVol] = useState(0.15);
  const abort = useRef<AbortController | null>(null);
  const subFile = useRef<HTMLInputElement>(null);

  // Video kaynağı: telefondaki dosya ya da YouTube oynatıcısı
  useEffect(() => {
    let url = "";
    let disposed = false;
    let yt: { player: YTPlayer; media: ReturnType<typeof youtubeMedia> } | null = null;
    if (isYT && meta.source?.kind === "youtube") {
      const em = new Emitter();
      const videoId = meta.source.videoId;
      loadYouTubeApi()
        .then((YT) => {
          if (disposed || !ytRef.current) return;
          const holder = document.createElement("div");
          ytRef.current.appendChild(holder);
          const player = new YT.Player(holder, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: { playsinline: 1, rel: 0, cc_load_policy: 0, modestbranding: 1 },
            events: {
              onReady: () => {
                if (disposed) return;
                const m = youtubeMedia(player, em);
                yt = { player, media: m };
                setMedia(m);
                const d = player.getDuration();
                if (d && !meta.duration) void update((l) => l.map((x) => (x.id === meta.id ? { ...x, duration: d } : x)));
              },
              onStateChange: (e: { data: number }) => {
                if (e.data === 2 || e.data === 0) em.emit("pause");
              },
            },
          });
        })
        .catch((e) => setErr((e as Error).message));
    } else if (meta.source?.kind === "remote") {
      setSrc(meta.source.url);
      altIdx.current = 0;
    } else {
      void loadVideoFile(meta.id).then((f) => {
        if (!f) return setMissing(true);
        url = URL.createObjectURL(f);
        setSrc(url);
      });
    }
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
      yt?.media.dispose();
      yt?.player.destroy();
      abort.current?.abort();
    };
  }, [meta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dosya videosu hazır olunca medya arayüzü
  useEffect(() => {
    if (!isYT && src && videoRef.current) setMedia(htmlMedia(videoRef.current));
  }, [src, isYT]);

  // Zamanı takip et (altyazı için)
  useEffect(() => {
    if (!media) return;
    // Yalnızca görünen altyazı satırı değişince yeniden çiz (uzun videolarda donmayı önler)
    let key = "";
    const f = () => {
      const t = media.currentTime;
      const { a, b } = subsRef.current;
      const k = `${cueAt(a, t)}|${cueAt(b, t)}`;
      if (k !== key) {
        key = k;
        setTime(t);
      }
    };
    f();
    return media.on("time", f);
  }, [media, sub1, sub2, meta.subs]);

  // Kaldığı yeri hatırla
  useEffect(() => {
    const v = media;
    if (!v) return;
    void get<number>(`video:pos:${meta.id}`).then((p) => p && (v.currentTime = p));
    const save = () => void set(`video:pos:${meta.id}`, v.currentTime);
    const t = window.setInterval(save, 5000);
    return () => {
      window.clearInterval(t);
      save();
    };
  }, [media, meta.id]);

  const c1 = meta.subs[sub1];
  const c2 = meta.subs[sub2];
  subsRef.current = { a: c1, b: c2 };
  const i1 = cueAt(c1, time);
  const i2 = cueAt(c2, time);

  async function saveSubs(key: string, cues: Cue[], extra: Partial<VideoMeta> = {}) {
    await update((l) => l.map((x) => (x.id === meta.id ? { ...x, ...extra, subs: { ...x.subs, [key]: cues } } : x)));
  }

  /** Yarım kalan işin ilerlemesini kaydeder (undefined → tamamlandı). */
  async function savePartial(key: string, cues: Cue[], upTo: number | undefined, extra: Partial<VideoMeta> = {}) {
    await update((l) =>
      l.map((x) => {
        if (x.id !== meta.id) return x;
        const partial = { ...(x.partial || {}) };
        if (upTo === undefined) delete partial[key];
        else partial[key] = upTo;
        return { ...x, ...extra, partial, subs: { ...x.subs, [key]: cues } };
      }),
    );
  }

  async function runTranscribe() {
    setErr("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    const duration = meta.duration || media?.duration || 0;
    const resume = meta.partial?.orig;
    let shown = false;
    const pr: Progress = {
      startAt: resume,
      prev: resume ? meta.subs.orig : [],
      lang: meta.spokenLang,
      onPartial: async (cues, upTo, lang) => {
        await savePartial("orig", cues, upTo, { spokenLang: lang || undefined });
        if (!shown && cues.length) {
          shown = true;
          setSub1("orig");
        }
      },
    };
    const done = async (r: { lang: string; cues: Cue[] }) => {
      if (!r.cues.length) throw new Error("Videoda konuşma bulunamadı.");
      await savePartial("orig", r.cues, undefined, { spokenLang: r.lang });
      setSub1("orig");
      setDubLang((d) => d || "orig");
      setBusy("");
    };
    try {
      // 1) YouTube ve uzak videolar: bağlantı doğrudan Gemini'ye verilir
      if (meta.source?.kind === "youtube" || meta.source?.kind === "remote") {
        setBusy("Gemini videoyu izliyor…");
        return await done(await transcribeCompat(meta.source.url, duration, setBusy, ctrl.signal, pr));
      }
      const f = await loadVideoFile(meta.id);
      if (!f) throw new Error("Video dosyası bulunamadı.");
      // 2) Küçük ve kısa dosyalar: dosyanın kendisi gönderilir
      if (f.size <= INLINE_MAX && duration && duration <= 20 * 60) {
        setBusy("Video hazırlanıyor…");
        const dataUrl = await fileToDataUrl(new Blob([f], { type: f.type || "video/mp4" }));
        return await done(await transcribeCompat(dataUrl, duration, setBusy, ctrl.signal, pr));
      }
      // 3) Büyük/uzun dosyalar (2 GB, saatlerce): ses telefonda 10 dakikalık parçalara ayrılır
      try {
        return await done(await transcribeAudio(f, duration, setBusy, ctrl.signal, pr));
      } catch (e) {
        // Ses aracı açılamazsa (eski tarayıcı) ve anahtar destekliyorsa Gemini dosya servisi
        if (!/Ses aracı|sesi okunamadı|WORKERFS|wasm|Worker/i.test((e as Error).message) || !settings.llmKey.startsWith("AIza")) throw e;
      }
      let g = meta.gemini && meta.gemini.expires > Date.now() ? meta.gemini : undefined;
      if (!g) {
        setBusy("Gemini'ye yükleniyor… %0");
        const up = await uploadToGemini(f, (p) => setBusy(`Gemini'ye yükleniyor… %${p}${p === 100 ? " — işleniyor" : ""}`), ctrl.signal);
        const saved = { ...up, expires: Date.now() + 47 * 3600_000 };
        g = saved;
        await update((l) => l.map((x) => (x.id === meta.id ? { ...x, gemini: saved } : x)));
      }
      await done(await transcribe(g, duration, (msg) => setBusy(msg), ctrl.signal));
    } catch (e) {
      setBusy("");
      if ((e as Error).name === "AbortError") return;
      const m = (e as Error).message;
      setErr(
        /quota|kullanım sınırı|429/i.test(m)
          ? `${m} — Gemini'nin ücretsiz günlük sınırı doldu. Yapılan kısım kaydedildi; yarın “Kaldığı yerden devam et”e bas.`
          : `${m} — Yapılan kısım kaydedildi; tekrar basınca kaldığı yerden devam eder.`,
      );
    }
  }

  async function runTranslate(code = target) {
    setErr("");
    const base = meta.subs.orig || meta.subs[sub1];
    if (!base?.length) return setErr("Önce altyazı çıkar ya da yükle.");
    const ctrl = new AbortController();
    abort.current = ctrl;
    const prev = meta.partial?.[code] && code !== "orig" ? meta.subs[code] || [] : [];
    const name = langByCode(code).label;
    try {
      setBusy(`${name} diline çevriliyor… ${prev.length}/${base.length}`);
      let shown = false;
      const out = await translateCues(
        base,
        langByCode(code).name,
        (d) => setBusy(`${name} diline çevriliyor… ${d}/${base.length}`),
        prev,
        async (part) => {
          await savePartial(code, part, part.length);
          if (!shown) {
            shown = true;
            setSub1(code);
            if (meta.subs.orig && code !== "orig") setSub2("orig");
          }
        },
        ctrl.signal,
      );
      await savePartial(code, out, undefined);
      setSub1(code);
      if (meta.subs.orig && code !== "orig") setSub2("orig");
      setDubLang(code);
      setBusy("");
    } catch (e) {
      setBusy("");
      if ((e as Error).name === "AbortError") return;
      const m = (e as Error).message;
      setErr(/quota|sınır|429/i.test(m) ? `${m} — Çevrilen kısım kaydedildi; sonra aynı dili seçince kaldığı yerden devam eder.` : m);
    }
  }

  // ---------- Dublaj ----------
  const dubBcp = dubLang === "orig" ? toBcp47(meta.spokenLang || guessSubLang(meta.subs.orig)) : dubLang;
  const dub = useDubber(media, dubOn ? meta.subs[dubLang] : undefined, dubBcp, origVol);

  const llmReady = health.llm || Boolean(settings.llmKey);
  const geminiReady = Boolean(settings.llmKey) && settings.llmBaseUrl.includes("generativelanguage");

  return (
    <div className="stack">
      <button className="btn ghost self-start" onClick={onBack}>
        ← Videolarım
      </button>
      <div className="card video-card">
        <h3 className="video-title">{meta.name}</h3>
        {isYT ? (
          <div className="video-wrap yt">
            <div ref={ytRef} className="yt-holder" />
            <div className="subs-overlay" aria-live="polite">
              {i2 >= 0 && <div className="sub sub2">{c2![i2].t}</div>}
              {i1 >= 0 && <div className="sub">{c1![i1].t}</div>}
            </div>
          </div>
        ) : missing ? (
          <p className="error">Video dosyası bu cihazda bulunamadı (tarayıcı verileri silinmiş olabilir). Altyazılar duruyor; videoyu yeniden yükleyebilirsin.</p>
        ) : (
          <div className="video-wrap">
            <video ref={videoRef} src={src || undefined} controls playsInline onError={onVideoError} />
            <div className="subs-overlay" aria-live="polite">
              {i2 >= 0 && <div className="sub sub2">{c2![i2].t}</div>}
              {i1 >= 0 && <div className="sub">{c1![i1].t}</div>}
            </div>
          </div>
        )}
        <div className="toolbar">
          <label className="small">
            Altyazı
            <select
              value={sub1}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("tr:")) {
                  const code = v.slice(3);
                  setTarget(code);
                  void runTranslate(code);
                } else {
                  setSub1(v);
                  if (v && v !== "orig" && meta.partial?.[v] !== undefined && !busy) void runTranslate(v);
                }
              }}
            >
              <option value="">Kapalı</option>
              {tracks.map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
              {tracks.length > 0 && llmReady && (
                <optgroup label="🌐 Başka dile çevir">
                  {LANGUAGES.filter((l) => !tracks.includes(l.code)).map((l) => (
                    <option key={l.code} value={`tr:${l.code}`}>
                      🌐 {l.flag} {l.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <label className="small">
            İkinci altyazı (dil öğrenmek için)
            <select value={sub2} onChange={(e) => setSub2(e.target.value)}>
              <option value="">Yok</option>
              {tracks.map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {busy && (
        <div className="card status sticky-status">
          <span className="spinner" /> {busy}
          <button className="btn ghost small" onClick={() => abort.current?.abort()}>
            Durdur
          </button>
        </div>
      )}
      {err && (
        <div className="error sticky-status card">
          {err}{" "}
          <button className="btn ghost small" onClick={() => setErr("")}>
            Kapat
          </button>
        </div>
      )}

      <div className="card">
        <h3>1 · Altyazı</h3>
        <div className="row wrap">
          <button className="btn primary" disabled={Boolean(busy) || !geminiReady} onClick={runTranscribe}>
            {meta.partial?.orig ? `▶ Kaldığı yerden devam et (${fmtTime(meta.partial.orig)})` : "🎙 Konuşmalardan altyazı çıkar (Gemini)"}
          </button>
          <button className="btn" onClick={() => subFile.current?.click()}>
            📄 .srt / .vtt yükle
          </button>
          <input
            ref={subFile}
            type="file"
            accept=".srt,.vtt,text/vtt"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const cues = parseSubs(await f.text());
              if (!cues.length) return setErr("Altyazı dosyası okunamadı.");
              await saveSubs("orig", cues);
              setSub1("orig");
              setDubLang((d) => d || "orig");
            }}
          />
        </div>
        {!geminiReady && (
          <p className="muted small">
            Altyazı çıkarmak için <b>Ayarlar → Telefonda yapay zekâ</b>'ya Google Gemini anahtarını ekle (ücretsiz). Uzun videolarda ses telefonda 10 dakikalık
            parçalara ayrılır; her parça kaydedilir, yarıda kalırsa kaldığı yerden devam edilir.
          </p>
        )}
      </div>

      <div className="card">
        <h3>2 · Çeviri</h3>
        <div className="row wrap">
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Hedef dil">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={Boolean(busy) || !llmReady || !tracks.length} onClick={() => runTranslate()}>
            🌐 Altyazıyı çevir
          </button>
        </div>
        {tracks.length > 0 && (
          <div className="row wrap">
            {tracks.map((k) => (
              <span key={k} className="row">
                <span className="pill">{label(k, meta)}</span>
                <button className="btn ghost small" onClick={() => download(`${meta.name.replace(/\.[^.]+$/, "")}.${k}.srt`, toSrt(meta.subs[k]), "application/x-subrip")}>
                  ⬇ SRT
                </button>
                <button className="btn ghost small" onClick={() => download(`${meta.name.replace(/\.[^.]+$/, "")}.${k}.vtt`, toVtt(meta.subs[k]), "text/vtt")}>
                  ⬇ VTT
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>3 · Dublaj</h3>
        <p className="muted small">Seçtiğin dildeki altyazılar video oynarken seslendirilir; orijinal ses kısılır. Nöral seslerle (♂/♀) en doğal sonucu verir.</p>
        <div className="row wrap">
          <select value={dubLang} onChange={(e) => setDubLang(e.target.value)} aria-label="Dublaj dili">
            <option value="">Dublaj dili seç…</option>
            {tracks.map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
          </select>
          <label className="check">
            <input
              type="checkbox"
              checked={dubOn}
              disabled={!dubLang}
              onChange={(e) => {
                if (e.target.checked) unlockAudio();
                setDubOn(e.target.checked);
              }}
            />{" "}
            Dublajı aç
          </label>
        </div>
        {dubLang && <VoicePicker lang={dubBcp} />}
        <label className="small">
          Orijinal ses: %{Math.round(origVol * 100)}
          <input type="range" min={0} max={1} step={0.05} value={origVol} onChange={(e) => setOrigVol(Number(e.target.value))} />
        </label>
        {dub && <p className="small dub-status">{dub}</p>}
      </div>

      {c1 && c1.length > 0 && (
        <div className="card">
          <h3>Metin ({label(sub1, meta)})</h3>
          <Transcript c1={c1} c2={c2} now={i1} media={media} />
        </div>
      )}
    </div>
  );
}

/** Uzun videolarda binlerce satır: satırlar bir kez hesaplanır, yalnızca etkin satır değişir. */
const Transcript = memo(function Transcript({ c1, c2, now, media }: { c1: Cue[]; c2?: Cue[]; now: number; media: MediaLike | null }) {
  const pairs = useMemo(() => c1.map((c) => (c2 ? c2[cueAt(c2, c.s + 0.05)]?.t : undefined)), [c1, c2]);
  const [all, setAll] = useState(false);
  const LIMIT = 300;
  // Çok uzun metinde etkin satırın çevresi gösterilir
  const from = all || c1.length <= LIMIT ? 0 : Math.max(0, Math.min(c1.length - LIMIT, Math.floor(Math.max(0, now) / 100) * 100 - 50));
  const to = all ? c1.length : Math.min(c1.length, from + LIMIT);
  const rows = [];
  for (let k = from; k < to; k++)
    rows.push(<TLine key={k} k={k} c={c1[k]} tr={pairs[k]} on={k === now} media={media} />);
  return (
    <div className="transcript">
      {from > 0 && <p className="muted small">… {from} satır önce</p>}
      {rows}
      {to < c1.length && !all && (
        <button className="btn ghost small" onClick={() => setAll(true)}>
          Tümünü göster ({c1.length} satır)
        </button>
      )}
    </div>
  );
});
const TLine = memo(function TLine({ c, tr, on, media }: { k: number; c: Cue; tr?: string; on: boolean; media: MediaLike | null }) {
  return (
    <button
      className={`tline ${on ? "now" : ""}`}
      onClick={() => {
        if (media) media.currentTime = c.s + 0.01;
      }}
    >
      <span className="muted small">{fmtTime(c.s)}</span> {c.t}
      {tr && <span className="muted small"> — {tr}</span>}
    </button>
  );
});

/** Telefon tarayıcıları kullanıcı dokunmadan ses çalmayı engelleyebilir: dokunma anında sesi “açar”. */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const dubAudio = typeof Audio !== "undefined" ? new Audio() : (null as unknown as HTMLAudioElement);
function unlockAudio() {
  try {
    dubAudio.src = SILENT_WAV;
    void dubAudio.play().catch(() => {});
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    /* desteklenmiyor */
  }
}

/** Video oynarken altyazıları zamanında seslendirir. */
function useDubber(media: MediaLike | null, cues: Cue[] | undefined, lang: string, origVol: number): string {
  const [info, setInfo] = useState("");
  const audio = dubAudio;
  const clips = useRef(new Map<number, Promise<string>>());
  const last = useRef(-1);

  useEffect(() => {
    media?.setVolume(cues ? origVol : 1);
  }, [cues, origVol, media]);

  useEffect(() => {
    const v = media;
    clips.current.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
    clips.current.clear();
    last.current = -1;
    if (!v || !cues?.length) {
      setInfo("");
      return;
    }
    let timer = 0;
    let alive = true;
    let ready = new Set<string>();
    let neuralBroken = false;
    const voiceOf = (text: string) => narrator.voiceFor({ text, lang });
    const neuralId = (text: string) => {
      const vid = voiceOf(text);
      return vid?.startsWith(NEURAL_PREFIX) && !neuralBroken ? vid.slice(NEURAL_PREFIX.length) : null;
    };
    // Ses modeli yalnızca bir kez indirilir (her satırda yeniden değil)
    const prepare = (id: string) => {
      if (ready.has(id)) return true;
      narrator
        .ensureVoice(id, (pct) => alive && setInfo(`⬇ Nöral ses indiriliyor %${pct} — bu sırada telefonun sesi kullanılıyor`))
        .then(() => {
          ready = new Set(ready).add(id);
        })
        .catch(() => (neuralBroken = true));
      return false;
    };
    const neuralClip = (k: number) => {
      const id = neuralId(cues[k].t);
      if (!id || !ready.has(id)) return null;
      let c = clips.current.get(k);
      if (!c) {
        c = synthNeural(cues[k].t, id);
        c.catch(() => clips.current.delete(k));
        clips.current.set(k, c);
      }
      return c;
    };
    // Uzun videolarda bellek dolmasın: geride kalan sesleri bırak
    const prune = (k: number) => {
      for (const [j, c] of clips.current)
        if (j < k - 1 || j > k + 4) {
          clips.current.delete(j);
          c.then((u) => URL.revokeObjectURL(u)).catch(() => {});
        }
    };
    const speakDevice = (k: number) => {
      const c = cues[k];
      const dur = Math.max(0.6, c.e - c.s);
      const u = new SpeechSynthesisUtterance(c.t);
      const dv = findVoice(neuralId(c.t) ? undefined : voiceOf(c.t), lang);
      if (dv) u.voice = dv;
      u.lang = dv?.lang || lang;
      u.rate = Math.min(1.7, Math.max(1, c.t.length / 15 / dur));
      u.onerror = (e) => e.error !== "interrupted" && e.error !== "canceled" && setInfo(`⚠️ Telefon sesi hata verdi: ${e.error}`);
      // Android'de cancel() hemen ardından speak() sesi yutabiliyor: kısa bekle
      if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
        setTimeout(() => alive && last.current === k && speechSynthesis.speak(u), 80);
      } else speechSynthesis.speak(u);
      setInfo(`🔊 ${k + 1}/${cues.length} · ${dv?.name || "telefonun varsayılan sesi"}${dv ? "" : lang ? ` (${lang} sesi bulunamadı)` : ""}`);
    };
    const speak = (k: number) => {
      const c = cues[k];
      const dur = Math.max(0.6, c.e - c.s);
      const id = neuralId(c.t);
      if (id && !prepare(id)) return speakDevice(k);
      prune(k);
      const clip = neuralClip(k);
      // Sonraki iki satırı önceden hazırla (sırayla, arka planda)
      for (let j = k + 1; j <= Math.min(k + 2, cues.length - 1); j++) neuralClip(j);
      if (!clip) return speakDevice(k);
      let late = false;
      const lateTimer = setTimeout(() => {
        // Sentez gecikirse satırı kaçırmamak için telefonun sesi
        late = true;
        if (alive && last.current === k && !v.paused) speakDevice(k);
      }, 1500);
      clip
        .then((url) => {
          clearTimeout(lateTimer);
          if (late || !alive || last.current !== k || v.paused) return;
          audio.src = url;
          audio.onloadedmetadata = () => {
            audio.playbackRate = Math.min(1.7, Math.max(1, audio.duration / dur));
          };
          audio.play().then(
            () => setInfo(`🔊 ${k + 1}/${cues.length} · nöral ses`),
            (e) => setInfo(`⚠️ Ses çalınamadı (${(e as Error).name}). “Dublajı aç” kutusunu kapatıp yeniden aç.`),
          );
        })
        .catch((e: Error) => {
          clearTimeout(lateTimer);
          if (e.message === "canceled") return;
          neuralBroken = true;
          setInfo("Nöral ses yüklenemedi; telefonun sesi kullanılıyor.");
          if (!late) speakDevice(k);
        });
    };
    const tick = () => {
      if (v.paused) return;
      const k = cueAt(cues, v.currentTime);
      if (k !== last.current) {
        last.current = k;
        if (k >= 0) speak(k);
      }
    };
    const stop = () => {
      audio.pause();
      speechSynthesis.cancel();
      last.current = -1;
    };
    const seek = () => {
      stop();
      cancelNeuralBefore();
      for (const c of clips.current.values()) c.then((u) => URL.revokeObjectURL(u)).catch(() => {});
      clips.current.clear();
    };
    const off1 = v.on("pause", stop);
    const off2 = v.on("seeking", seek);
    timer = window.setInterval(tick, 200);
    setInfo("Dublaj açık: videoyu oynat.");
    return () => {
      alive = false;
      clearInterval(timer);
      off1();
      off2();
      seek();
    };
  }, [cues, lang, audio, media]);

  return info;
}
