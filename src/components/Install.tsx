import { useEffect, useState } from "react";

// Chrome/Edge (Android) "yükle" istemini sayfa açılır açılmaz verir; kaçırmamak için erkenden yakalanır.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    subs.forEach((f) => f());
  });
}

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallButton({ compact }: { compact?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);

  if (isStandalone()) return compact ? null : <p className="small">✅ Lisan bu cihazda uygulama olarak yüklü.</p>;
  if (deferred)
    return (
      <button
        className={`btn primary ${compact ? "small" : ""}`}
        onClick={async () => {
          const d = deferred!;
          await d.prompt();
          await d.userChoice;
          deferred = null;
          force((x) => x + 1);
        }}
      >
        📲 Uygulamayı yükle
      </button>
    );
  if (compact) return null;
  return (
    <p className="small">
      {isIOS()
        ? "iPhone/iPad: Safari'de alttaki Paylaş (□↑) düğmesine bas → “Ana Ekrana Ekle”."
        : "Chrome'da sağ üstteki ⋮ menüsü → “Uygulamayı yükle” ya da “Ana ekrana ekle”. (Düğme görünmüyorsa sayfayı bir kez yenile.)"}
    </p>
  );
}
