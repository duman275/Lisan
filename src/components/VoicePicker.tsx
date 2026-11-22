import { useEffect, useState } from "react";
import { useSettings } from "../lib/store";
import { narrator, useVoices } from "../lib/tts";
import { deviceGender, GENDER_ICON, NEURAL_PREFIX, neuralFor } from "../lib/voices";

const SAMPLE: Record<string, string> = {
  tr: "Merhaba! Bu sesle kitabını baştan sona okuyabilirim.",
  en: "Hello! I can read your whole book aloud in this voice.",
  de: "Hallo! Mit dieser Stimme lese ich dir das ganze Buch vor.",
  fr: "Bonjour ! Je peux lire tout ton livre avec cette voix.",
  es: "¡Hola! Puedo leer todo tu libro con esta voz.",
  it: "Ciao! Posso leggere tutto il tuo libro con questa voce.",
  ru: "Привет! Я могу прочитать всю книгу этим голосом.",
};

/** Dil için ses seçimi: kadın/erkek, nöral (cihazda, ücretsiz) ya da cihaz sesi. */
export function VoicePicker({ lang, compact }: { lang: string; compact?: boolean }) {
  const [settings, setSettings] = useSettings();
  const lang2 = lang.slice(0, 2).toLowerCase();
  const device = useVoices(lang);
  const neural = neuralFor(lang2);
  const current = settings.voiceByLang?.[lang2] || "";
  const [dl, setDl] = useState("");
  const [stored, setStored] = useState<string[]>([]);
  useEffect(() => {
    void narrator.storedVoices().then(setStored);
  }, [dl]);

  const set = (v: string) => setSettings((s) => ({ ...s, voiceByLang: { ...(s.voiceByLang || {}), [lang2]: v } }));
  const isNeural = current.startsWith(NEURAL_PREFIX);
  const nId = isNeural ? current.slice(NEURAL_PREFIX.length) : "";

  return (
    <div className={compact ? "row wrap" : "stack"}>
      {!compact && (
        <div className="segmented small" role="radiogroup" aria-label="Ses cinsiyeti">
          {(
            [
              ["auto", "Otomatik"],
              ["f", "♀ Kadın"],
              ["m", "♂ Erkek"],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              className={(settings.voiceGender || "auto") === g && !current ? "on" : ""}
              onClick={() => setSettings((s) => ({ ...s, voiceGender: g, voiceByLang: { ...(s.voiceByLang || {}), [lang2]: "" } }))}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <select value={current} onChange={(e) => set(e.target.value)} aria-label="Ses">
        <option value="">
          {settings.voiceGender === "f" ? "♀ Otomatik kadın sesi" : settings.voiceGender === "m" ? "♂ Otomatik erkek sesi" : "Otomatik ses"}
        </option>
        {neural.length > 0 && (
          <optgroup label="🧠 Nöral sesler — doğal, ücretsiz, ekran kapalıyken de okur">
            {neural.map((v) => (
              <option key={v.id} value={NEURAL_PREFIX + v.id}>
                {v.gender === "f" ? "♀" : "♂"} {v.name}
                {v.accent ? ` (${v.accent})` : ""} · {v.quality} kalite{stored.includes(v.id) ? " ✓" : ""}
              </option>
            ))}
          </optgroup>
        )}
        {device.length > 0 && (
          <optgroup label="📱 Telefonun sesleri">
            {device.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {GENDER_ICON[deviceGender(v)] ? `${GENDER_ICON[deviceGender(v)].slice(0, 1)} ` : ""}
                {v.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {!compact && (
        <div className="row wrap">
          <button className="btn small" onClick={() => narrator.say(SAMPLE[lang2] || SAMPLE.en, lang, 1, current || undefined)}>
            ▶ Sesi dene
          </button>
          {isNeural && !stored.includes(nId) && (
            <button
              className="btn small"
              disabled={Boolean(dl)}
              onClick={async () => {
                setDl("%0");
                try {
                  await narrator.downloadVoice(nId, (p) => setDl(`%${p}`));
                  setDl("");
                } catch (e) {
                  setDl(`Hata: ${(e as Error).message}`);
                }
              }}
            >
              {dl ? `İndiriliyor ${dl}` : "⬇ Çevrimdışı için indir"}
            </button>
          )}
          {!neural.some((v) => v.gender === "f") && settings.voiceGender === "f" && neural.length > 0 && (
            <span className="muted small">Bu dilde nöral kadın sesi yok; telefonun kadın sesi kullanılır.</span>
          )}
        </div>
      )}
    </div>
  );
}
