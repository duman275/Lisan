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

export function listen(lang: string): { promise: Promise<string>; stop: () => void } {
  const C = ctor();
  if (!C) return { promise: Promise.reject(new Error("Tarayıcınız konuşma tanımayı desteklemiyor (Chrome/Edge önerilir).")), stop: () => {} };
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
    r.onerror = (e) => reject(new Error(e.error === "not-allowed" ? "Mikrofon izni verilmedi." : `Tanıma hatası: ${e.error}`));
    r.onend = () => resolve(got);
  });
  r.start();
  return { promise, stop: () => r.stop() };
}
