import { del, get, keys, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import type { Card } from "./srs";

// ---------- localStorage tabanlı küçük durumlar ----------

const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`lisan:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(`lisan:${key}`, JSON.stringify(value));
  } catch {
    /* depolama dolu veya kapalı */
  }
  listeners.get(key)?.forEach((fn) => fn());
}

/** Bileşen dışı (ör. asistan araçları) okuma/yazma */
export const getStored = read;
export const setStored = write;

export function usePersistent<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const fn = () => setValue(read(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => void listeners.get(key)!.delete(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(read(key, fallback)) : v;
      write(key, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, update];
}

export interface Settings {
  targetLang: string; // ör. en-US
  nativeLang: string; // ör. Türkçe
  levels: Record<string, string>; // dil kodu → CEFR
  voiceURI?: string;
  voiceByLang: Record<string, string>; // dil (tr, en…) → seçili ses ("piper:…" nöral ya da cihaz sesi)
  voiceGender: "auto" | "f" | "m";
  rate: number;
  pitch: number;
  podcastVoiceA?: string;
  podcastVoiceB?: string;
  dailyGoal: number; // dakika
  voiceCommands: boolean; // mikrofon düğmesi ile sesli komut
  wakeWord: boolean; // "Lisan" diye seslenince sürekli dinleme
  agentProvider: "auto" | "claude" | "ollama" | "free"; // tüm yapay zekâ özellikleri için kaynak
  agentSpeak: boolean; // asistan yanıtlarını sesli oku
  // Telefonda (sunucusuz sürüm) doğrudan bağlanılan yapay zekâ servisi
  llmProvider: string;
  llmBaseUrl: string;
  llmModel: string;
  llmKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  targetLang: "en-US",
  nativeLang: "Türkçe",
  levels: {},
  voiceByLang: {},
  voiceGender: "auto",
  rate: 1,
  pitch: 1,
  dailyGoal: 45,
  voiceCommands: true,
  wakeWord: false,
  agentProvider: "auto",
  agentSpeak: true,
  llmProvider: "gemini",
  llmBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  llmModel: "gemini-2.5-flash",
  llmKey: "",
};

export function useSettings(): [Settings, (v: Settings | ((prev: Settings) => Settings)) => void] {
  const [s, set] = usePersistent<Settings>("settings", DEFAULT_SETTINGS);
  return [{ ...DEFAULT_SETTINGS, ...s }, set];
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>("settings", {}) };
}

export function useCards() {
  return usePersistent<Card[]>("cards", []);
}

export interface Progress {
  xp: number;
  streak: number;
  lastDay: string; // YYYY-MM-DD
  days: Record<string, number>; // gün → xp
  doneUnits: Record<string, true>; // "en-US|A1|3"
}

export const DEFAULT_PROGRESS: Progress = { xp: 0, streak: 0, lastDay: "", days: {}, doneUnits: {} };

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addXp(amount: number) {
  const p = read<Progress>("progress", DEFAULT_PROGRESS);
  const t = today();
  if (p.lastDay !== t) {
    const y = new Date(Date.now() - 86_400_000);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    p.streak = p.lastDay === yesterday ? p.streak + 1 : 1;
    p.lastDay = t;
  }
  p.xp += amount;
  p.days = { ...p.days, [t]: (p.days[t] || 0) + amount };
  write("progress", p);
}

export function useProgress() {
  return usePersistent<Progress>("progress", DEFAULT_PROGRESS);
}

// ---------- IndexedDB: kitap kütüphanesi ----------

export interface LibraryItem {
  id: string;
  title: string;
  author?: string;
  lang?: string; // BCP-47 ya da ISO kodu
  kind: "gutenberg" | "pdf" | "paste" | "story" | "summary" | "analysis";
  text: string;
  added: number;
  position: number; // kaldığı cümle
  sources?: { url: string; title: string }[];
}

export type LibraryMeta = Omit<LibraryItem, "text"> & { size: number };

const LIB = "lib:";
const META = "libmeta";

export async function saveItem(item: LibraryItem) {
  await set(LIB + item.id, item);
  const meta = ((await get<LibraryMeta[]>(META)) || []).filter((m) => m.id !== item.id);
  const { text, ...rest } = item;
  meta.unshift({ ...rest, size: text.length });
  await set(META, meta);
  listeners.get("library")?.forEach((fn) => fn());
}

export async function loadItem(id: string) {
  return get<LibraryItem>(LIB + id);
}

export async function deleteItem(id: string) {
  await del(LIB + id);
  const meta = ((await get<LibraryMeta[]>(META)) || []).filter((m) => m.id !== id);
  await set(META, meta);
  listeners.get("library")?.forEach((fn) => fn());
}

export async function savePosition(id: string, position: number) {
  const item = await loadItem(id);
  if (!item) return;
  item.position = position;
  await set(LIB + id, item);
  const meta = (await get<LibraryMeta[]>(META)) || [];
  const m = meta.find((x) => x.id === id);
  if (m) {
    m.position = position;
    await set(META, meta);
  }
}

export async function libraryMeta(): Promise<LibraryMeta[]> {
  return (await get<LibraryMeta[]>(META)) || [];
}

export function useLibrary(): LibraryMeta[] {
  const [items, setItems] = useState<LibraryMeta[]>([]);
  useEffect(() => {
    const load = () => void get<LibraryMeta[]>(META).then((m) => setItems(m || []));
    load();
    if (!listeners.has("library")) listeners.set("library", new Set());
    listeners.get("library")!.add(load);
    return () => void listeners.get("library")!.delete(load);
  }, []);
  return items;
}

// ---------- Önbellek (üretilen dersler) ----------

export async function cacheGet<T>(key: string) {
  return get<T>("cache:" + key);
}
export async function cacheSet<T>(key: string, value: T) {
  await set("cache:" + key, value);
}
export async function cacheKeys() {
  return (await keys()).filter((k) => String(k).startsWith("cache:"));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
