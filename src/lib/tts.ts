// Tarayıcının Web Speech API'si üzerine kurulu anlatıcı: cümle cümle seslendirir, vurgular,
// duraklat/devam, ileri/geri, uyku zamanlayıcısı ve çok sesli (podcast) oynatma destekler.
import { useEffect, useState } from "react";
import { deviceGender, NEURAL_PREFIX, NEURAL_VOICES, neuralFor } from "./voices";

export interface Segment {
  text: string;
  lang?: string;
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  label?: string; // ör. konuşmacı adı
}

export interface NarratorState {
  playing: boolean;
  paused: boolean;
  index: number;
  total: number;
  title: string;
  sleepAt: number | null;
  ownerId: string | null;
  loading?: string; // nöral ses modeli indirilirken durum
}

export const VOICE_PRESETS = [
  { id: "dogal", name: "Doğal", rate: 1, pitch: 1 },
  { id: "anlatici", name: "Masalcı (yavaş, sıcak)", rate: 0.88, pitch: 0.95 },
  { id: "derin", name: "Derin & ciddi", rate: 0.95, pitch: 0.75 },
  { id: "enerjik", name: "Enerjik podcast", rate: 1.12, pitch: 1.1 },
  { id: "ogrenci", name: "Dil öğrencisi (çok yavaş)", rate: 0.7, pitch: 1 },
  { id: "hizli", name: "Hızlı dinleme", rate: 1.5, pitch: 1 },
];

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

/** Nöral sesi (Piper) cihazda üretir; ilk kullanımda model bir kez indirilir. */
type Vits = typeof import("@diffusionstudio/vits-web");
let vitsMod: Promise<Vits> | null = null;
const loadVits = () => (vitsMod ??= import("@diffusionstudio/vits-web"));

class Narrator {
  private segs: Segment[] = [];
  private onIndex?: (i: number) => void;
  private onEnd?: () => void;
  private token = 0;
  private sleepTimer: number | null = null;
  private subs = new Set<() => void>();
  private audio: HTMLAudioElement | null = null;
  private clips = new Map<string, Promise<string>>(); // "i|ses" → nesne URL'si
  private neuralFailed = false; // nöral ses yüklenemediyse bu oturumda cihaz sesine geç
  defaults = {
    rate: 1,
    pitch: 1,
    voiceURI: undefined as string | undefined,
    voiceByLang: {} as Record<string, string>,
    gender: "auto" as "auto" | "f" | "m",
  };
  state: NarratorState = { playing: false, paused: false, index: 0, total: 0, title: "", sleepAt: null, ownerId: null, loading: "" };

  supported() {
    return Boolean(synth) || typeof Audio !== "undefined";
  }

  subscribe(fn: () => void) {
    this.subs.add(fn);
    return () => void this.subs.delete(fn);
  }
  private emit(patch: Partial<NarratorState>) {
    this.state = { ...this.state, ...patch };
    this.subs.forEach((f) => f());
  }

  play(segs: Segment[], opts: { start?: number; title?: string; ownerId?: string; onIndex?: (i: number) => void; onEnd?: () => void } = {}) {
    this.stop(false);
    this.segs = segs;
    this.onIndex = opts.onIndex;
    this.onEnd = opts.onEnd;
    this.emit({ title: opts.title || "", total: segs.length, ownerId: opts.ownerId || null });
    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: opts.title || "Lisan",
        artist: "Lisan",
        artwork: [{ src: `${import.meta.env.BASE_URL}icon-512.png`, sizes: "512x512", type: "image/png" }],
      });
    }
    this.speakFrom(opts.start || 0);
  }

  /** Bu parça hangi sesle okunacak? (açık seçim → dile özel tercih → cinsiyet tercihi → otomatik) */
  voiceFor(s: Segment): string | undefined {
    const lang2 = (s.lang || "").slice(0, 2).toLowerCase();
    const explicit = s.voiceURI || this.defaults.voiceByLang[lang2] || this.defaults.voiceURI;
    if (explicit && !(this.neuralFailed && explicit.startsWith(NEURAL_PREFIX))) {
      if (explicit.startsWith(NEURAL_PREFIX)) {
        const nv = NEURAL_VOICES.find((v) => NEURAL_PREFIX + v.id === explicit);
        if (nv && (!lang2 || nv.lang === lang2)) return explicit;
      } else {
        const dv = findVoice(explicit, s.lang);
        if (dv?.voiceURI === explicit) return explicit;
      }
    }
    const g = this.defaults.gender;
    if (g === "auto" || !lang2) return undefined;
    const device = (voiceCache.length ? voiceCache : loadVoices()).filter((v) => v.lang.toLowerCase().startsWith(lang2));
    const dMatch = device.find((v) => deviceGender(v) === g);
    const nMatch = neuralFor(lang2).find((v) => v.gender === g);
    if (this.neuralFailed) return dMatch?.voiceURI;
    if (g === "m") return nMatch ? NEURAL_PREFIX + nMatch.id : dMatch?.voiceURI;
    return dMatch?.voiceURI || (nMatch ? NEURAL_PREFIX + nMatch.id : undefined);
  }

  private clip(i: number, voiceId: string): Promise<string> {
    const key = `${i}|${voiceId}`;
    let c = this.clips.get(key);
    if (!c) {
      const text = this.segs[i].text;
      c = this.ensureVoice(voiceId)
        .then(() => neuralBlob(text, voiceId))
        .then((blob) => URL.createObjectURL(blob));
      c.catch(() => this.clips.delete(key));
      this.clips.set(key, c);
    }
    return c;
  }

  private clearClips() {
    for (const c of this.clips.values()) c.then((u) => URL.revokeObjectURL(u)).catch(() => {});
    this.clips.clear();
  }

  private speakFrom(i: number) {
    const my = ++this.token;
    synth?.cancel();
    this.audio?.pause();
    if (i >= this.segs.length) {
      this.emit({ playing: false, paused: false, index: Math.max(0, this.segs.length - 1), loading: "" });
      this.onEnd?.();
      return;
    }
    const s = this.segs[i];
    const vid = this.voiceFor(s);
    this.emit({ playing: true, paused: false, index: i });
    this.onIndex?.(i);

    // --- Nöral ses: ses dosyası olarak çalar (ekran kapalıyken de devam eder) ---
    if (vid?.startsWith(NEURAL_PREFIX)) {
      const voiceId = vid.slice(NEURAL_PREFIX.length);
      // Sonraki cümleleri önceden hazırla
      for (let k = i + 1; k <= Math.min(i + 3, this.segs.length - 1); k++) if (this.voiceFor(this.segs[k]) === vid) void this.clip(k, voiceId);
      // Eski klipleri bırak
      for (const key of [...this.clips.keys()]) {
        const n = Number(key.split("|")[0]);
        if (n < i - 1) {
          this.clips.get(key)!.then((u) => URL.revokeObjectURL(u)).catch(() => {});
          this.clips.delete(key);
        }
      }
      this.clip(i, voiceId)
        .then((url) => {
          if (my !== this.token) return;
          if (this.state.loading) this.emit({ loading: "" });
          const a = (this.audio ??= new Audio());
          a.src = url;
          a.playbackRate = Math.min(2, Math.max(0.5, (s.rate ?? 1) * this.defaults.rate));
          a.onended = () => {
            if (my === this.token) this.speakFrom(i + 1);
          };
          a.onerror = () => {
            if (my === this.token) this.speakFrom(i + 1);
          };
          a.play().catch(() => {
            if (my === this.token) this.emit({ playing: false, paused: true });
          });
        })
        .catch((e) => {
          if (my !== this.token) return;
          // Nöral ses yüklenemezse cihaz sesine düş (bu oturum boyunca)
          this.neuralFailed = true;
          this.emit({ loading: `Nöral ses yüklenemedi (${(e as Error).message}); cihaz sesi kullanılıyor.` });
          this.speakDevice(i, my, undefined);
        });
      return;
    }
    this.speakDevice(i, my, vid);
  }

  private speakDevice(i: number, my: number, vid: string | undefined) {
    if (!synth) return;
    const s = this.segs[i];
    const u = new SpeechSynthesisUtterance(s.text);
    const voice = findVoice(vid, s.lang);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || s.lang || "";
    u.rate = (s.rate ?? 1) * this.defaults.rate;
    u.pitch = s.pitch ?? this.defaults.pitch;
    u.onend = () => {
      if (my === this.token) this.speakFrom(i + 1);
    };
    u.onerror = (e) => {
      if (my !== this.token) return;
      if (e.error === "interrupted" || e.error === "canceled") return;
      this.speakFrom(i + 1);
    };
    synth.speak(u);
  }

  pause() {
    if (!this.state.playing) return;
    this.token++; // devam eden cümlenin bitişi ilerletmesin
    synth?.cancel();
    this.audio?.pause();
    this.emit({ playing: false, paused: true });
  }
  resume() {
    if (this.state.paused) this.speakFrom(this.state.index);
  }
  toggle() {
    if (this.state.playing) this.pause();
    else this.resume();
  }
  next() {
    if (this.segs.length) this.speakFrom(Math.min(this.state.index + 1, this.segs.length - 1));
  }
  prev() {
    if (this.segs.length) this.speakFrom(Math.max(this.state.index - 1, 0));
  }
  seek(i: number) {
    if (this.segs.length) this.speakFrom(Math.max(0, Math.min(i, this.segs.length - 1)));
  }
  stop(emit = true) {
    this.token++;
    synth?.cancel();
    this.audio?.pause();
    this.clearClips();
    this.setSleep(null);
    if (emit) this.emit({ playing: false, paused: false, ownerId: null, total: 0, title: "", loading: "" });
  }
  setSleep(minutes: number | null) {
    if (this.sleepTimer) window.clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    if (minutes) {
      this.sleepTimer = window.setTimeout(() => this.pause(), minutes * 60_000);
      this.emit({ sleepAt: Date.now() + minutes * 60_000 });
    } else if (this.state.sleepAt) this.emit({ sleepAt: null });
  }
  /** Tek seferlik kısa seslendirme (kelime, cümle) */
  say(text: string, lang?: string, rate = 1, voiceURI?: string) {
    if (this.state.playing) this.pause();
    const vid = this.voiceFor({ text, lang, voiceURI });
    if (vid?.startsWith(NEURAL_PREFIX)) {
      this.token++;
      synth?.cancel();
      neuralBlob(text, vid.slice(NEURAL_PREFIX.length))
        .then((blob) => {
          const a = (this.audio ??= new Audio());
          a.onended = null;
          a.src = URL.createObjectURL(blob);
          a.playbackRate = rate;
          void a.play();
        })
        .catch(() => this.sayDevice(text, lang, rate, undefined));
      return;
    }
    this.sayDevice(text, lang, rate, vid);
  }
  private sayDevice(text: string, lang: string | undefined, rate: number, vid: string | undefined) {
    if (!synth) return;
    this.token++;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = findVoice(vid, lang);
    if (v) u.voice = v;
    u.lang = v?.lang || lang || "";
    u.rate = rate;
    synth.speak(u);
  }
  /** Bir nöral sesi önceden indirir (Ayarlar'dan). */
  async downloadVoice(id: string, onProgress: (pct: number) => void) {
    this.neuralFailed = false;
    const t = await loadVits();
    await t.download(id as Parameters<Vits["download"]>[0], (p) => p.total && onProgress(Math.round((p.loaded / p.total) * 100)));
  }
  private voiceDl = new Map<string, Promise<void>>();
  /** Ses modelini (gerekirse) bir kez indirir; ilerlemeyi gösterir. */
  ensureVoice(id: string, onProgress?: (pct: number) => void): Promise<void> {
    let p = this.voiceDl.get(id);
    if (!p) {
      p = this.storedVoices().then((st) =>
        st.includes(id)
          ? undefined
          : this.downloadVoice(id, (pct) => {
              onProgress?.(pct);
              this.emit({ loading: `Ses modeli indiriliyor… %${pct} (bir kez)` });
            }),
      );
      p.catch(() => this.voiceDl.delete(id));
      this.voiceDl.set(id, p);
    }
    return p;
  }
  async storedVoices(): Promise<string[]> {
    try {
      return (await (await loadVits()).stored()) as string[];
    } catch {
      return [];
    }
  }
}

export const narrator = new Narrator();

export function useNarrator(): NarratorState {
  const [s, setS] = useState(narrator.state);
  useEffect(() => {
    const off = narrator.subscribe(() => setS(narrator.state));
    return off;
  }, []);
  return s;
}

let voiceCache: SpeechSynthesisVoice[] = [];
function loadVoices() {
  voiceCache = synth?.getVoices() || [];
  return voiceCache;
}

export function findVoice(uri?: string, lang?: string): SpeechSynthesisVoice | undefined {
  const voices = voiceCache.length ? voiceCache : loadVoices();
  if (uri) {
    const v = voices.find((x) => x.voiceURI === uri);
    // Seçili ses farklı bir dile aitse, metnin diline uygun ses tercih edilir
    if (v && (!lang || v.lang.slice(0, 2).toLowerCase() === lang.slice(0, 2).toLowerCase())) return v;
  }
  if (!lang) return undefined;
  const p = lang.slice(0, 2).toLowerCase();
  const matches = voices.filter((x) => x.lang.toLowerCase().startsWith(p));
  return (
    matches.find((x) => x.lang.toLowerCase() === lang.toLowerCase() && /natural|neural|premium|enhanced|google/i.test(x.name)) ||
    matches.find((x) => /natural|neural|premium|enhanced|google/i.test(x.name)) ||
    matches.find((x) => x.lang.toLowerCase() === lang.toLowerCase()) ||
    matches[0]
  );
}

export function useVoices(lang?: string): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => loadVoices());
  useEffect(() => {
    if (!synth) return;
    const fn = () => setVoices(loadVoices());
    synth.addEventListener("voiceschanged", fn);
    fn();
    return () => synth.removeEventListener("voiceschanged", fn);
  }, []);
  if (!lang) return voices;
  const p = lang.slice(0, 2).toLowerCase();
  return voices.filter((v) => v.lang.toLowerCase().startsWith(p));
}

/** ISO 639-1 kodunu (Gutenberg "en") BCP-47'ye çevirir */
export function toBcp47(code?: string): string {
  if (!code) return "en-US";
  if (code.includes("-")) return code;
  const map: Record<string, string> = {
    en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT", pt: "pt-BR", nl: "nl-NL", ru: "ru-RU",
    ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", ar: "ar-SA", tr: "tr-TR", fi: "fi-FI", sv: "sv-SE", el: "el-GR", la: "it-IT",
  };
  return map[code] || code;
}

const NATIVE_CODES: Record<string, string> = { Türkçe: "tr-TR", English: "en-US", Deutsch: "de-DE" };
export function nativeCode(name: string) {
  return NATIVE_CODES[name] || "tr-TR";
}

/** Dil ve cinsiyete göre bir ses seçer (önce cihaz kadın sesi / nöral erkek sesi). */
export function pickVoiceByGender(lang: string, g: "f" | "m"): string | undefined {
  const lang2 = lang.slice(0, 2).toLowerCase();
  const device = (voiceCache.length ? voiceCache : loadVoices()).filter((v) => v.lang.toLowerCase().startsWith(lang2));
  const d = device.find((v) => deviceGender(v) === g);
  const n = neuralFor(lang2).find((v) => v.gender === g);
  if (g === "m") return n ? NEURAL_PREFIX + n.id : d?.voiceURI;
  return d?.voiceURI || (n ? NEURAL_PREFIX + n.id : device[0]?.voiceURI);
}

/** Nöral sesle tek bir metni ses dosyasına çevirir (dublaj için). */
export async function synthNeural(text: string, voiceId: string): Promise<string> {
  return URL.createObjectURL(await neuralBlob(text, voiceId));
}

// Sentez ayrı iş parçacığında yapılır; model bir kez yüklenir (arayüz donmaz)
let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, { ok: (b: Blob) => void; fail: (e: Error) => void }>();
function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./ttsWorker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (ev: MessageEvent<{ id: number; wav?: ArrayBuffer; error?: string }>) => {
        const p = pending.get(ev.data.id);
        if (!p) return;
        pending.delete(ev.data.id);
        if (ev.data.wav) p.ok(new Blob([ev.data.wav], { type: "audio/wav" }));
        else p.fail(new Error(ev.data.error || "sentez hatası"));
      };
      worker.onerror = () => {
        workerBroken = true;
        worker = null;
        for (const p of pending.values()) p.fail(new Error("worker"));
        pending.clear();
      };
    } catch {
      workerBroken = true;
      return null;
    }
  }
  return worker;
}
/** Bu numaradan önceki bekleyen sentez isteklerini iptal eder (sarma/atlama sonrası). */
export function cancelNeuralBefore(): void {
  worker?.postMessage({ cancelBelow: nextId });
}
export async function neuralBlob(text: string, voiceId: string): Promise<Blob> {
  const w = getWorker();
  if (w) {
    try {
      return await new Promise<Blob>((ok, fail) => {
        const id = nextId++;
        pending.set(id, { ok, fail });
        w.postMessage({ id, text, voiceId });
      });
    } catch (e) {
      const m = (e as Error).message;
      if (m === "canceled") throw e;
      // İşçi bu cihazda çalışmadıysa eski yönteme geç (bir daha işçiyi deneme)
      if (m !== "worker" && /Unknown|bilinmeyen|wasm|import|module|Tensor|session|onnx/i.test(m)) {
        workerBroken = true;
        worker?.terminate();
        worker = null;
      } else if (m !== "worker") throw e;
    }
  }
  const t = await loadVits();
  return t.predict({ text, voiceId: voiceId as Parameters<Vits["predict"]>[0]["voiceId"] });
}
