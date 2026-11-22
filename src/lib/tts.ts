// Tarayıcının Web Speech API'si üzerine kurulu anlatıcı: cümle cümle seslendirir, vurgular,
// duraklat/devam, ileri/geri, uyku zamanlayıcısı ve çok sesli (podcast) oynatma destekler.
import { useEffect, useState } from "react";

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

class Narrator {
  private segs: Segment[] = [];
  private onIndex?: (i: number) => void;
  private onEnd?: () => void;
  private token = 0;
  private sleepTimer: number | null = null;
  private subs = new Set<() => void>();
  defaults = { rate: 1, pitch: 1, voiceURI: undefined as string | undefined };
  state: NarratorState = { playing: false, paused: false, index: 0, total: 0, title: "", sleepAt: null, ownerId: null };

  supported() {
    return Boolean(synth);
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
    if (!synth) return;
    this.stop(false);
    this.segs = segs;
    this.onIndex = opts.onIndex;
    this.onEnd = opts.onEnd;
    this.emit({ title: opts.title || "", total: segs.length, ownerId: opts.ownerId || null });
    this.speakFrom(opts.start || 0);
  }

  private speakFrom(i: number) {
    if (!synth) return;
    const my = ++this.token;
    synth.cancel();
    if (i >= this.segs.length) {
      this.emit({ playing: false, paused: false, index: Math.max(0, this.segs.length - 1) });
      this.onEnd?.();
      return;
    }
    const s = this.segs[i];
    const u = new SpeechSynthesisUtterance(s.text);
    const voice = findVoice(s.voiceURI || this.defaults.voiceURI, s.lang);
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
    this.emit({ playing: true, paused: false, index: i });
    this.onIndex?.(i);
    synth.speak(u);
  }

  pause() {
    if (!synth || !this.state.playing) return;
    this.token++; // devam eden cümlenin onend'i ilerletmesin
    synth.cancel();
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
    this.setSleep(null);
    if (emit) this.emit({ playing: false, paused: false, ownerId: null, total: 0, title: "" });
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
    if (!synth) return;
    this.token++;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = findVoice(voiceURI || this.defaults.voiceURI, lang);
    if (v) u.voice = v;
    u.lang = v?.lang || lang || "";
    u.rate = rate;
    synth.speak(u);
    if (this.state.playing) this.emit({ playing: false, paused: true });
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
