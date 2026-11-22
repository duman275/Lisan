import { useEffect, useState } from "react";
import { useSettings } from "../lib/store";
import { narrator, useNarrator } from "../lib/tts";

const RATES = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

/** Ekranın altında sabit duran oynatıcı (podcast/sesli kitap kontrolü). */
export function Player() {
  const n = useNarrator();
  const [settings, setSettings] = useSettings();
  const [, tick] = useState(0);

  useEffect(() => {
    narrator.defaults.rate = settings.rate;
    narrator.defaults.pitch = settings.pitch;
    narrator.defaults.voiceURI = settings.voiceURI;
  }, [settings.rate, settings.pitch, settings.voiceURI]);

  useEffect(() => {
    if (!n.sleepAt) return;
    const t = window.setInterval(() => tick((x) => x + 1), 15_000);
    return () => window.clearInterval(t);
  }, [n.sleepAt]);

  // Medya tuşları / kilit ekranı kontrolleri
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => narrator.resume());
    navigator.mediaSession.setActionHandler("pause", () => narrator.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => narrator.next());
    navigator.mediaSession.setActionHandler("previoustrack", () => narrator.prev());
  }, []);

  if (!n.total) return null;
  const pct = n.total > 1 ? (n.index / (n.total - 1)) * 100 : 0;
  const sleepLeft = n.sleepAt ? Math.max(0, Math.round((n.sleepAt - Date.now()) / 60_000)) : null;

  return (
    <div className="player" role="region" aria-label="Oynatıcı">
      <div className="player-progress">
        <input
          type="range"
          min={0}
          max={Math.max(0, n.total - 1)}
          value={n.index}
          onChange={(e) => narrator.seek(Number(e.target.value))}
          aria-label="Konum"
          style={{ ["--pct" as string]: `${pct}%` }}
        />
      </div>
      <div className="player-row">
        <div className="player-title" title={n.title}>
          <strong>{n.title || "Dinleniyor"}</strong>
          <span className="muted">
            {n.index + 1} / {n.total}
            {sleepLeft !== null && ` · 🌙 ${sleepLeft} dk`}
          </span>
        </div>
        <div className="player-controls">
          <button className="icon" onClick={() => narrator.prev()} aria-label="Önceki cümle">⏮</button>
          <button className="icon big" onClick={() => narrator.toggle()} aria-label={n.playing ? "Duraklat" : "Oynat"}>
            {n.playing ? "⏸" : "▶"}
          </button>
          <button className="icon" onClick={() => narrator.next()} aria-label="Sonraki cümle">⏭</button>
        </div>
        <div className="player-extra">
          <select value={settings.rate} onChange={(e) => setSettings((s) => ({ ...s, rate: Number(e.target.value) }))} aria-label="Hız">
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
          <select
            value={sleepLeft === null ? "" : "on"}
            onChange={(e) => narrator.setSleep(e.target.value && e.target.value !== "on" ? Number(e.target.value) : null)}
            aria-label="Uyku zamanlayıcısı"
          >
            <option value="">🌙 Kapalı</option>
            {sleepLeft !== null && <option value="on">🌙 {sleepLeft} dk</option>}
            {[5, 15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} dk
              </option>
            ))}
          </select>
          <button className="icon" onClick={() => narrator.stop()} aria-label="Kapat">✕</button>
        </div>
      </div>
    </div>
  );
}
