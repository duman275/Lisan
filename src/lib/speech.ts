// Konuşma tanıma (telaffuz/gölgeleme pratiği). Chrome, Edge ve Safari'de çalışır.
interface SR {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function ctor(): (new () => SR) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function canRecognize() {
  return typeof window !== "undefined" && Boolean(ctor());
}

// Aynı anda tek tanıma çalışabildiği için sürekli dinleyici (uyandırma kelimesi) tek seferlik dinlemede duraklatılır.
const hooks = { before: () => {}, after: () => {} };
export function setListenHooks(before: () => void, after: () => void) {
  hooks.before = before;
  hooks.after = after;
}

export function listen(lang: string): { promise: Promise<string>; stop: () => void } {
  const C = ctor();
  if (!C) return { promise: Promise.reject(new Error("Tarayıcınız konuşma tanımayı desteklemiyor (Chrome/Edge önerilir).")), stop: () => {} };
  hooks.before();
  const r = new C();
  r.lang = lang;
  r.interimResults = false;
  r.maxAlternatives = 1;
  const promise = new Promise<string>((resolve, reject) => {
    let got = "";
    r.onresult = (e) => {
      got = Array.from(e.results)
        .map((x) => x[0].transcript)
        .join(" ");
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // sessizlik: boş sonuç döner
      reject(new Error(e.error === "not-allowed" ? "Mikrofon izni verilmedi." : `Tanıma hatası: ${e.error}`));
    };
    r.onend = () => resolve(got);
  }).finally(() => setTimeout(() => hooks.after(), 300));
  try {
    r.start();
  } catch (e) {
    hooks.after();
    return { promise: Promise.reject(e as Error), stop: () => {} };
  }
  return { promise, stop: () => r.stop() };
}

/** Sürekli dinleme: her kesin sonuç için onText çağrılır. Tarayıcı oturumu kapatırsa yeniden başlatır. */
export function continuousListener(lang: string, onText: (t: string) => void) {
  const C = ctor();
  let active = false;
  let r: (SR & { continuous?: boolean }) | null = null;
  function start() {
    if (!C || !active) return;
    r = new C() as SR & { continuous?: boolean };
    r.lang = lang;
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const res = e.results as unknown as ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
      const last = res[res.length - 1];
      if (last && last.isFinal !== false) onText(last[0].transcript.trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") active = false;
    };
    r.onend = () => {
      if (active) setTimeout(start, 400);
    };
    try {
      r.start();
    } catch {
      /* zaten çalışıyor */
    }
  }
  return {
    start() {
      if (active) return;
      active = true;
      start();
    },
    stop() {
      active = false;
      try {
        r?.stop();
      } catch {
        /* yok say */
      }
    },
    get active() {
      return active;
    },
  };
}
