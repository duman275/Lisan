import { useEffect, useState } from "react";
import { jsonAI } from "../lib/api";
import { newCard } from "../lib/srs";
import { useCards, useSettings } from "../lib/store";
import { narrator } from "../lib/tts";
import { langByCode } from "../data/languages";
import { useHealth } from "./common";

interface Def {
  lemma: string;
  partOfSpeech: string;
  meaning: string;
  pronunciation: string;
  example: string;
}

export interface WordTarget {
  word: string;
  context: string;
  lang: string;
  x: number;
  y: number;
}

/** Okurken dokunulan kelimenin anlamı + desteye ekleme. */
export function WordPopup({ target, onClose }: { target: WordTarget; onClose: () => void }) {
  const [settings] = useSettings();
  const [cards, setCards] = useCards();
  const health = useHealth();
  const [def, setDef] = useState<Def | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDef(null);
    setErr("");
    if (!health.ai) return;
    let live = true;
    jsonAI<Def>({
      task: "define",
      word: target.word,
      context: target.context,
      targetLang: langByCode(target.lang).name,
      nativeLang: settings.nativeLang,
    })
      .then((d) => live && setDef(d))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [target.word, target.context, target.lang, settings.nativeLang, health.ai]);

  const id = `${target.lang}:${(def?.lemma || target.word).toLowerCase()}`;
  const inDeck = cards.some((c) => c.id === id);
  const left = Math.min(Math.max(8, target.x - 150), window.innerWidth - 316);
  const top = target.y + 12 + 220 > window.innerHeight ? Math.max(8, target.y - 232) : target.y + 12;

  return (
    <>
      <div className="popup-backdrop" onClick={onClose} />
      <div className="popup" style={{ left, top }} role="dialog" aria-label={`${target.word} anlamı`}>
        <div className="row between">
          <strong className="popup-word">{def?.lemma || target.word}</strong>
          <button className="icon" onClick={() => narrator.say(def?.lemma || target.word, target.lang, 0.85)} aria-label="Seslendir">
            🔊
          </button>
        </div>
        {!health.ai && <p className="muted">Anlam için yapay zekâ gerekir (sunucu anahtarı yok).</p>}
        {health.ai && !def && !err && (
          <p className="status">
            <span className="spinner" /> Aranıyor…
          </p>
        )}
        {err && <p className="error">{err}</p>}
        {def && (
          <>
            <p className="muted small">
              {def.partOfSpeech} · {def.pronunciation}
            </p>
            <p>{def.meaning}</p>
            <p className="example">{def.example}</p>
          </>
        )}
        <button
          className="btn primary full"
          disabled={inDeck || (!def && health.ai)}
          onClick={() => {
            setCards((cs) => [
              ...cs,
              newCard(target.lang, {
                word: def?.lemma || target.word,
                translation: def?.meaning || "",
                example: target.context.slice(0, 300),
                reading: def?.pronunciation,
              }),
            ]);
          }}
        >
          {inDeck ? "✓ Destede" : "＋ Kelime desteme ekle"}
        </button>
      </div>
    </>
  );
}

/** Metni tıklanabilir kelimelere ayırır. */
export function Clickable({ text, lang = "en", onWord }: { text: string; lang?: string; onWord: (word: string, e: React.MouseEvent) => void }) {
  // Intl.Segmenter boşluksuz dillerde (Japonca, Çince) de kelime sınırlarını bulur
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const parts: { t: string; word: boolean }[] = Seg
    ? Array.from(new Seg(lang.slice(0, 2), { granularity: "word" }).segment(text), (s) => ({ t: s.segment, word: Boolean(s.isWordLike) }))
    : text.split(/(\p{L}[\p{L}\p{M}'’-]*)/u).map((t, i) => ({ t, word: i % 2 === 1 }));
  return (
    <>
      {parts.map(({ t: p, word }, i) =>
        word ? (
          <span
            key={i}
            className="w"
            onClick={(e) => {
              e.stopPropagation();
              onWord(p, e);
            }}
          >
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
