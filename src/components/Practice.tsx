import { useCallback, useEffect, useRef, useState } from "react";
import { jsonAI, streamAI } from "../lib/api";
import { Markdown } from "../lib/markdown";
import { canRecognize, listen } from "../lib/speech";
import { addXp, saveItem, uid, usePersistent, useSettings } from "../lib/store";
import { plainText, splitSentences } from "../lib/text";
import { narrator } from "../lib/tts";
import { langByCode, LEVELS, type Level } from "../data/languages";
import { useHealth, useNav, useStream } from "./common";
import { Clickable, WordPopup, type WordTarget } from "./WordPopup";

// ---------- Yapay zekâ öğretmen ----------

type Msg = { role: "user" | "assistant"; content: string };

const MODES = [
  { id: "free conversation", label: "Serbest sohbet" },
  { id: "everyday small talk like a friendly native speaker, using natural everyday spoken language and contractions", label: "Günlük konuşma" },
  {
    id: "native-like casual chat: use natural idioms, phrasal verbs and current informal expressions (no offensive slang) and briefly explain the new ones after the correction section",
    label: "Native sohbet (deyim & argo)",
  },
  { id: "speaking fluency coach: keep my turns long, ask open questions, and in the feedback comment on fluency and naturalness, suggesting more natural phrasing", label: "Konuşma akıcılığı koçu" },
  { id: "role-play: ordering at a restaurant", label: "Rol: restoran" },
  { id: "role-play: job interview", label: "Rol: iş görüşmesi" },
  { id: "role-play: travel and hotel check-in", label: "Rol: seyahat" },
  { id: "debate: the tutor takes the opposite side", label: "Münazara" },
  { id: "grammar coach: explain my mistakes in depth", label: "Gramer koçu" },
  { id: "book club: discuss a book or story I read", label: "Kitap kulübü" },
];

export function Tutor({ lang, level }: { lang: string; level: string }) {
  const [settings] = useSettings();
  const health = useHealth();
  const [mode, setMode] = useState(MODES[0].id);
  const [history, setHistory] = usePersistent<Msg[]>(`tutor:${lang}`, []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [rec, setRec] = useState<{ stop: () => void } | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  const historyRef = useRef(history);
  historyRef.current = history;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history.length, pending]);
  useEffect(() => () => void (handsFreeRef.current = false), []);

  // Eller serbest mod: dinle → gönder → yanıtı seslendir → tekrar dinle
  const listenLoop = useCallback(async (tries = 0): Promise<void> => {
    if (!handsFreeRef.current) return;
    const l = listen(lang);
    setRec(l);
    let heard = "";
    try {
      heard = (await l.promise).trim();
    } catch (e) {
      setErr((e as Error).message);
      handsFreeRef.current = false;
      setHandsFree(false);
    } finally {
      setRec(null);
    }
    if (!handsFreeRef.current) return;
    if (!heard) {
      if (tries < 3) return listenLoop(tries + 1);
      handsFreeRef.current = false;
      setHandsFree(false);
      return;
    }
    if (/^(stop|dur|bitir|kapat|that's all)\b/i.test(heard)) {
      handsFreeRef.current = false;
      setHandsFree(false);
      return;
    }
    await sendRef.current(heard, true);
  }, [lang]);

  async function send(text: string, voice = false) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...historyRef.current, { role: "user", content: text.trim() }];
    setHistory(next);
    setInput("");
    setBusy(true);
    setErr("");
    setPending("");
    try {
      const r = await streamAI(
        { task: "tutor", targetLang: langByCode(lang).name, nativeLang: settings.nativeLang, level, mode: voice ? `${mode}. This is a spoken voice conversation: keep your reply short (2-4 sentences) before the correction section.` : mode, messages: next },
        { onText: (_c, full) => setPending(full) },
      );
      setHistory([...next, { role: "assistant", content: r.text }]);
      addXp(4);
      if (autoSpeak || handsFreeRef.current) {
        // Yalnızca hedef dildeki ana yanıtı oku (düzeltme bölümünden önce)
        const main = plainText(r.text.split(/✍️|Düzeltme/)[0]);
        const segs = splitSentences(main, lang).map((s) => ({ text: s.text, lang }));
        if (segs.length) narrator.play(segs, { title: "Öğretmen", ownerId: "tutor", onEnd: () => void listenLoop() });
        else void listenLoop();
      }
    } catch (e) {
      setErr((e as Error).message);
      handsFreeRef.current = false;
      setHandsFree(false);
    } finally {
      setPending("");
      setBusy(false);
    }
  }

  const sendRef = useRef(send);
  sendRef.current = send;

  async function speak() {
    if (rec) return rec.stop();
    const l = listen(lang);
    setRec(l);
    try {
      const heard = await l.promise;
      if (heard) setInput((v) => (v ? v + " " : "") + heard);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRec(null);
    }
  }

  function toggleHandsFree() {
    const on = !handsFree;
    setHandsFree(on);
    handsFreeRef.current = on;
    if (on) {
      narrator.stop();
      void listenLoop();
    } else {
      rec?.stop();
      narrator.stop();
    }
  }

  return (
    <div className="stack">
      <div className="row wrap between">
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Pratik modu">
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <div className="row wrap">
          {canRecognize() && (
            <button className={`btn ${handsFree ? "primary" : ""}`} onClick={toggleHandsFree} disabled={!health.ai}>
              {handsFree ? "⏹ Sesli sohbeti bitir" : "🎧 Eller serbest sesli sohbet"}
            </button>
          )}
          <label className="check"><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Yanıtı sesli oku</label>
          <button className="btn ghost" onClick={() => setHistory([])}>Yeni sohbet</button>
        </div>
      </div>
      <div className="chat card">
        {!history.length && !pending && (
          <div className="muted center">
            <p>Hedef dilde yaz ya da 🎙 ile konuş. Öğretmen doğal yanıt verir, ardından hatalarını düzeltir ve seni tekrar konuşturur.</p>
            <div className="row wrap center-row">
              {["Hi! Can we practice small talk?", "I want to talk about my weekend.", "Help me prepare for a job interview."].map((s) => (
                <button key={s} className="chip" onClick={() => send(s)} disabled={!health.ai}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" ? <Markdown text={m.content} /> : m.content}
            {m.role === "assistant" && (
              <button className="icon small" onClick={() => narrator.say(plainText(m.content.split(/✍️|Düzeltme/)[0]), lang)} aria-label="Seslendir">🔊</button>
            )}
          </div>
        ))}
        {pending && <div className="msg assistant"><Markdown text={pending} /></div>}
        {busy && !pending && <div className="status"><span className="spinner" /> Yazıyor…</div>}
        <div ref={end} />
      </div>
      {handsFree && (
        <div className="notice live">
          {rec ? "🎙 Dinliyorum… konuş (bitirmek için “stop” de)" : busy ? "💭 Düşünüyor…" : "🔊 Öğretmen konuşuyor…"}
        </div>
      )}
      {err && <div className="error">{err}</div>}
      <form className="row composer" onSubmit={(e) => (e.preventDefault(), send(input))}>
        {canRecognize() && (
          <button type="button" className={`icon ${rec ? "rec" : ""}`} onClick={speak} aria-label="Konuş">{rec ? "⏹" : "🎙"}</button>
        )}
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`${langByCode(lang).label} yaz…`} disabled={!health.ai} />
        <button className="btn primary" disabled={busy || !input.trim() || !health.ai}>Gönder</button>
      </form>
    </div>
  );
}

// ---------- Seviyeli hikâye (anlaşılır girdi) ----------

export function Story({ lang, level }: { lang: string; level: string }) {
  const health = useHealth();
  const { go } = useNav();
  const s = useStream();
  const [topic, setTopic] = useState("");
  const [len, setLen] = useState("medium (~400 words)");
  const [target, setTarget] = useState<WordTarget | null>(null);
  const [tr, setTr] = useState("");
  const [trBusy, setTrBusy] = useState(false);
  const [settings] = useSettings();
  const sentences = splitSentences(plainText(s.text.replace(/^#.*\n/, "")), lang);
  const title = /^#\s*(.+)/.exec(s.text)?.[1] || "Hikâye";

  return (
    <div className="stack">
      <div className="card">
        <h3>Seviyene göre hikâye ({level})</h3>
        <p className="muted small">Metnin ~%95'ini anlayacağın, yeni kelimeleri tekrar tekrar kullanan kısa hikâyeler. Bilmediğin kelimeye dokun.</p>
        <div className="row wrap">
          <input placeholder="Konu/tür: gizem, aşk, bilimkurgu, günlük hayat…" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <select value={len} onChange={(e) => setLen(e.target.value)} aria-label="Uzunluk">
            <option value="short (~200 words)">Kısa</option>
            <option value="medium (~400 words)">Orta</option>
            <option value="long (~800 words), in 3 short chapters">Uzun</option>
          </select>
          <button
            className="btn primary"
            disabled={s.loading || !health.ai}
            onClick={() => (setTr(""), s.run({ task: "story", targetLang: langByCode(lang).name, level, topic, mode: len }).then((r) => r && addXp(10)))}
          >
            {s.loading ? "Yazılıyor…" : "✨ Hikâye yaz"}
          </button>
        </div>
        {s.error && <div className="error">{s.error}</div>}
      </div>
      {s.text && (
        <div className="card reader-text">
          <div className="row wrap between">
            <h2>{title}</h2>
            <div className="row wrap">
              <button className="btn" onClick={() => narrator.play(sentences.map((x) => ({ text: x.text, lang })), { title, ownerId: "story" })}>🎧 Dinle</button>
              <button className="btn" onClick={() => narrator.play(sentences.map((x) => ({ text: x.text, lang, rate: 0.7 })), { title, ownerId: "story" })}>🐢 Yavaş</button>
              <button
                className="btn"
                disabled={trBusy}
                onClick={async () => {
                  setTrBusy(true);
                  try {
                    setTr((await jsonAI<{ translation: string }>({ task: "translate", text: s.text, nativeLang: settings.nativeLang })).translation);
                  } catch (e) {
                    setTr((e as Error).message);
                  } finally {
                    setTrBusy(false);
                  }
                }}
              >
                {trBusy ? "Çevriliyor…" : "🌐 Çeviri"}
              </button>
              <button
                className="btn"
                disabled={s.loading}
                onClick={async () => {
                  const id = uid();
                  await saveItem({ id, title, kind: "story", lang, text: plainText(s.text.replace(/^#.*\n/, "")), added: Date.now(), position: 0 });
                  go({ tab: "library", readerId: id });
                }}
              >
                📖 Okuyucuda aç
              </button>
            </div>
          </div>
          <p className="story">
            {sentences.map((x, i) => (
              <span key={i}>
                <Clickable text={x.text} lang={lang} onWord={(w, e) => setTarget({ word: w, context: x.text, lang, x: e.clientX, y: e.clientY })} />{" "}
              </span>
            ))}
          </p>
          {tr && <div className="translation"><Markdown text={tr} /></div>}
        </div>
      )}
      {target && <WordPopup target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}

// ---------- Seviye tespit sınavı ----------

interface Q {
  level: Level;
  question: string;
  options: string[];
  answer: number;
}

export function Placement({ lang, onResult }: { lang: string; onResult: (l: Level) => void }) {
  const [settings] = useSettings();
  const health = useHealth();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    setBusy(true);
    setErr("");
    try {
      const r = await jsonAI<{ questions: Q[] }>({ task: "placement", targetLang: langByCode(lang).name, nativeLang: settings.nativeLang });
      setQs(r.questions);
      setI(0);
      setAnswers([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function result(): Level {
    // Bir seviyedeki soruların en az 2/3'ü doğruysa o seviye geçilmiş sayılır
    let reached: Level = "A1";
    for (const l of LEVELS) {
      const idx = qs!.map((q, k) => (q.level === l ? k : -1)).filter((k) => k >= 0);
      const ok = idx.filter((k) => answers[k]).length;
      if (idx.length && ok / idx.length >= 0.66) reached = l;
      else break;
    }
    return reached;
  }

  if (!qs)
    return (
      <div className="card center">
        <h3>Seviye tespit sınavı</h3>
        <p className="muted">A1'den C2'ye zorlaşan 18 soru. ~5 dakika. Sonuca göre müfredatın ve desteler ayarlanır.</p>
        <button className="btn primary" onClick={start} disabled={busy || !health.ai}>{busy ? "Hazırlanıyor…" : "Sınava başla"}</button>
        {err && <div className="error">{err}</div>}
      </div>
    );

  if (i >= qs.length) {
    const lvl = result();
    const correct = answers.filter(Boolean).length;
    return (
      <div className="card center">
        <h2>Seviyen: {lvl}</h2>
        <p>{correct}/{qs.length} doğru</p>
        <button className="btn primary" onClick={() => onResult(lvl)}>{lvl} seviyesinden başla</button>
      </div>
    );
  }

  const q = qs[i];
  return (
    <div className="card">
      <div className="row between"><span className="pill">{q.level}</span><span className="muted">{i + 1}/{qs.length}</span></div>
      <div className="progressbar"><div style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <h3>{q.question}</h3>
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} className="opt" onClick={() => (setAnswers([...answers, k === q.answer]), setI(i + 1))}>{o}</button>
        ))}
        <button className="opt ghost" onClick={() => (setAnswers([...answers, false]), setI(i + 1))}>Bilmiyorum</button>
      </div>
    </div>
  );
}
