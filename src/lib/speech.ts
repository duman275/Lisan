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

// ---------- Mikrofon izni ----------

export type MicState = "granted" | "denied" | "prompt" | "unsupported";
let micGranted = false;

export async function micState(): Promise<MicState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const st = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (st.state === "granted") micGranted = true;
    return st.state as MicState;
  } catch {
    return micGranted ? "granted" : "prompt";
  }
}

/** Mikrofon iznini ister (izin penceresini açar); izin verilirse true. */
export async function requestMic(): Promise<boolean> {
  if (micGranted) return true;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micGranted = true;
    return true;
  } catch {
    return false;
  }
}

export const MIC_HELP =
  "Mikrofon izni kapalı. Lisan, Chrome üzerinden çalıştığı için izin Chrome'a verilir (Lisan'ın kendi izin sayfası boş görünür, bu normal): 1) Android Ayarlar → Uygulamalar → Chrome → İzinler → Mikrofon → “Uygulama kullanılırken izin ver”. 2) Samsung'da hızlı panelde ya da Ayarlar → Güvenlik ve gizlilik → Gizlilik → “Mikrofon erişimi” açık olsun. 3) Chrome → ⋮ → Ayarlar → Site ayarları → Mikrofon → duman275.github.io “İzin ver”. Sonra Lisan'ı kapatıp aç.";

const SR_ERRORS: Record<string, string> = {
  "not-allowed": MIC_HELP,
  "service-not-allowed": "Konuşma tanıma servisi kapalı. Android'de Google uygulamasının açık ve güncel olduğundan emin ol (Ayarlar → Uygulamalar → Google), ses dilinde Türkçe/İngilizce indirili olsun.",
  "audio-capture": "Mikrofon kullanılamıyor (başka bir uygulama kullanıyor olabilir ya da mikrofon bulunamadı).",
  network: "Konuşma tanıma için internet bağlantısı gerekli.",
  "language-not-supported": "Bu dil için konuşma tanıma desteklenmiyor.",
};

export function listen(lang: string): { promise: Promise<string>; stop: () => void } {
  const C = ctor();
  if (!C) return { promise: Promise.reject(new Error("Tarayıcınız konuşma tanımayı desteklemiyor (Chrome/Edge önerilir).")), stop: () => {} };
  // İlk kullanımda mikrofon izni istenir; sonra tanıma başlar
  let stopped = false;
  let rec: SR | null = null;
  const ready = micGranted ? Promise.resolve(true) : requestMic();
  const promise = ready.then((ok) => {
    if (!ok) throw new Error(MIC_HELP);
    if (stopped) return "";
    const inner = startRecognition(C, lang, (r) => (rec = r));
    return inner;
  });
  return {
    promise,
    stop: () => {
      stopped = true;
      rec?.stop();
    },
  };
}

function startRecognition(C: new () => SR, lang: string, onStart: (r: SR) => void): Promise<string> {
  hooks.before();
  const r = new C();
  onStart(r);
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
      if (e.error === "not-allowed") micGranted = false;
      reject(new Error(SR_ERRORS[e.error] || `Konuşma tanıma hatası: ${e.error}`));
    };
    r.onend = () => resolve(got);
  }).finally(() => setTimeout(() => hooks.after(), 300));
  try {
    r.start();
  } catch (e) {
    hooks.after();
    return Promise.reject(e as Error);
  }
  return promise;
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
      if (micGranted) start();
      else void requestMic().then((ok) => (ok ? start() : (active = false)));
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
