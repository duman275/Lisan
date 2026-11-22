import { useMemo, useState } from "react";
import { jsonAI } from "../lib/api";
import { isMature, newCard, previewInterval, schedule, type Card, type Grade } from "../lib/srs";
import { addXp, useCards, useSettings } from "../lib/store";
import { narrator } from "../lib/tts";
import { langByCode } from "../data/languages";
import { SEED_EN } from "../data/seedDeck";
import { useHealth } from "./common";

const NEW_PER_SESSION = 15;

export function Flashcards({ lang, level }: { lang: string; level: string }) {
  const [cards, setCards] = useCards();
  const [settings] = useSettings();
  const health = useHealth();
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [theme, setTheme] = useState("");
  const [reviewed, setReviewed] = useState(0);
  const [reverse, setReverse] = useState(false);

  const mine = useMemo(() => cards.filter((c) => c.lang === lang), [cards, lang]);
  const now = Date.now();
  const due = mine.filter((c) => c.reps > 0 && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = mine.filter((c) => c.reps === 0 && c.due <= now).sort((a, b) => a.added - b.added).slice(0, NEW_PER_SESSION);
  const queue = [...due, ...fresh];
  const card = queue[0];

  function grade(g: Grade) {
    if (!card) return;
    setCards((cs) => cs.map((c) => (c.id === card.id ? schedule(c, g) : c)));
    setFlipped(false);
    setReviewed((r) => r + 1);
    addXp(g === 0 ? 1 : 2);
  }

  async function generate() {
    setBusy(true);
    setErr("");
    try {
      const r = await jsonAI<{ cards: Omit<Card, "id" | "lang" | "ease" | "interval" | "reps" | "lapses" | "due" | "added">[] }>({
        task: "deck",
        targetLang: langByCode(lang).name,
        nativeLang: settings.nativeLang,
        level,
        topic: theme || undefined,
        count: 20,
        exclude: mine.map((c) => c.word),
      });
      setCards((cs) => {
        const ids = new Set(cs.map((c) => c.id));
        const add = r.cards.map((c) => newCard(lang, c)).filter((c) => !ids.has(c.id));
        return [...cs, ...add];
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function addSeed() {
    setCards((cs) => {
      const ids = new Set(cs.map((c) => c.id));
      const add = SEED_EN.map(([word, translation, example, exampleTranslation]) => newCard(lang, { word, translation, example, exampleTranslation })).filter(
        (c) => !ids.has(c.id),
      );
      return [...cs, ...add];
    });
  }

  const stats = {
    total: mine.length,
    mature: mine.filter(isMature).length,
    learning: mine.filter((c) => c.reps > 0 && !isMature(c)).length,
    unseen: mine.filter((c) => c.reps === 0).length,
  };
  const front = card ? (reverse ? card.translation : card.word) : "";

  return (
    <div className="stack">
      <div className="stats">
        <div><b>{due.length}</b><span>tekrar</span></div>
        <div><b>{fresh.length}</b><span>yeni</span></div>
        <div><b>{stats.learning}</b><span>öğreniliyor</span></div>
        <div><b>{stats.mature}</b><span>kalıcı (21g+)</span></div>
        <div><b>{stats.total}</b><span>toplam</span></div>
      </div>

      {card ? (
        <div className="flash card" onClick={() => !flipped && setFlipped(true)}>
          <div className="flash-front">
            <div className="flash-word">{front}</div>
            {!reverse && card.reading && <div className="muted">{card.reading}</div>}
            <button
              className="icon"
              onClick={(e) => {
                e.stopPropagation();
                narrator.say(card.word, lang, 0.85);
              }}
              aria-label="Seslendir"
            >
              🔊
            </button>
          </div>
          {flipped ? (
            <div className="flash-back">
              <div className="flash-answer">{reverse ? card.word : card.translation}</div>
              {card.example && (
                <p className="example" onClick={(e) => (e.stopPropagation(), narrator.say(card.example!, lang, 0.9))}>
                  🔊 {card.example}
                </p>
              )}
              {card.exampleTranslation && <p className="muted">{card.exampleTranslation}</p>}
              <div className="grades" onClick={(e) => e.stopPropagation()}>
                {(["Tekrar", "Zor", "İyi", "Kolay"] as const).map((label, g) => (
                  <button key={label} className={`grade g${g}`} onClick={() => grade(g as Grade)}>
                    {label}
                    <small>{previewInterval(card, g as Grade)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted center">Cevabı aklından söyle, sonra kartı çevirmek için dokun.</p>
          )}
        </div>
      ) : (
        <div className="card center">
          <h3>{reviewed ? `🎉 Bugünlük bitti — ${reviewed} kart tekrar edildi` : "Şu an tekrar edilecek kart yok"}</h3>
          <p className="muted">Yeni kelimeler ekleyerek devam edebilirsin. Kartlar unutmak üzere olduğun anda geri gelir.</p>
        </div>
      )}

      <div className="card">
        <h3>Yeni kelimeler ekle</h3>
        <p className="muted small">Sıklık sırasıyla, seviyene göre ({level}) en faydalı kelime ve kalıplar üretilir; bildiklerin tekrar edilmez.</p>
        <div className="row wrap">
          <input placeholder="Tema (isteğe bağlı): seyahat, iş, duygular…" value={theme} onChange={(e) => setTheme(e.target.value)} />
          <button className="btn primary" disabled={busy || !health.ai} onClick={generate}>
            {busy ? "Üretiliyor…" : "＋ 20 kelime üret"}
          </button>
          {lang.startsWith("en") && (
            <button className="btn" onClick={addSeed}>
              Hazır başlangıç destesi (50)
            </button>
          )}
          <label className="check">
            <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> Ters yön (anlamdan kelimeye)
          </label>
        </div>
        {err && <div className="error">{err}</div>}
      </div>
    </div>
  );
}
