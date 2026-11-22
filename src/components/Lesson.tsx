import { useEffect, useState } from "react";
import { jsonAI } from "../lib/api";
import { Markdown } from "../lib/markdown";
import { newCard } from "../lib/srs";
import { canRecognize, listen } from "../lib/speech";
import { addXp, cacheGet, cacheSet, useCards, useProgress, useSettings } from "../lib/store";
import { similarity } from "../lib/text";
import { narrator, useVoices } from "../lib/tts";
import { CURRICULUM } from "../data/curriculum";
import { COURSES, courseName } from "../data/courses";
import { langByCode, LEVELS, type Level } from "../data/languages";
import { useHealth } from "./common";

interface LessonData {
  source?: "free";
  title: string;
  goal: string;
  explanation: string;
  vocab: { word: string; reading: string; translation: string; example: string; exampleTranslation: string }[];
  dialogue: { speaker: string; line: string; translation: string }[];
  exercises: { kind: "mcq" | "fill" | "translate" | "order"; prompt: string; options: string[]; answer: string; explanation: string }[];
  shadowing: string[];
}

export function Path({ lang, level, setLevel }: { lang: string; level: Level; setLevel: (l: Level) => void }) {
  const [progress] = useProgress();
  const [open, setOpen] = useState<number | null>(null);
  const units = CURRICULUM[level];
  const done = units.filter((_, i) => progress.doneUnits[`${lang}|${level}|${i}`]).length;

  if (open !== null)
    return (
      <LessonView
        lang={lang}
        level={level}
        topic={units[open]}
        heading={`${level} · Ünite ${open + 1}`}
        doneKey={`${lang}|${level}|${open}`}
        unitKey={`${level}:${open}`}
        cacheKey={`lesson|${lang}|${level}|${open}`}
        onBack={() => setOpen(null)}
        onNext={() => setOpen(open + 1 < units.length ? open + 1 : null)}
      />
    );

  return (
    <div className="stack">
      <div className="row wrap between">
        <div className="segmented">
          {LEVELS.map((l) => (
            <button key={l} className={l === level ? "on" : ""} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        <span className="muted">
          {done}/{units.length} ünite tamamlandı
        </span>
      </div>
      <div className="progressbar"><div style={{ width: `${(done / units.length) * 100}%` }} /></div>
      <ol className="path">
        {units.map((u, i) => {
          const isDone = progress.doneUnits[`${lang}|${level}|${i}`];
          return (
            <li key={u}>
              <button className={`unit ${isDone ? "done" : ""}`} onClick={() => setOpen(i)}>
                <span className="unit-num">{isDone ? "✓" : i + 1}</span>
                <span>{u}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function LessonView({
  lang,
  level,
  topic,
  heading,
  doneKey,
  cacheKey,
  courseFocus,
  unitKey,
  onBack,
  onNext,
}: {
  lang: string;
  level: string;
  topic: string;
  heading: string;
  doneKey: string;
  cacheKey: string;
  courseFocus?: string;
  unitKey?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [settings] = useSettings();
  const [, setProgress] = useProgress();
  const [cards, setCards] = useCards();
  const health = useHealth();
  const [data, setData] = useState<LessonData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const key = `${cacheKey}|${settings.nativeLang}`;

  async function load(force = false) {
    setErr("");
    setLoading(true);
    try {
      const cached = force ? undefined : await cacheGet<LessonData>(key);
      if (cached) return setData(cached);
            const d = await jsonAI<LessonData>({ task: "lesson", targetLang: langByCode(lang).name, nativeLang: settings.nativeLang, level, topic, courseFocus, unitKey });
      await cacheSet(key, d);
      setData(d);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setData(null);
    void load();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  function complete() {
    setProgress((p) => ({ ...p, doneUnits: { ...p.doneUnits, [doneKey]: true } }));
    addXp(30);
    onNext();
  }

  const existing = new Set(cards.map((c) => c.id));
  return (
    <div className="stack lesson">
      <div className="row between wrap">
        <button className="btn ghost" onClick={onBack}>← Üniteler</button>
        {data && <button className="btn ghost" onClick={() => load(true)}>↻ Yeniden üret</button>}
      </div>
      <h2>
        {heading}: {data?.title || topic}
      </h2>
      {loading && <div className="status"><span className="spinner" /> Ders hazırlanıyor (ilk seferde ~20 sn)…</div>}
      {err && <div className="error">{err}</div>}
      {data && (
        <>
          <div className="card"><b>🎯 Hedef:</b> {data.goal}</div>

          <section className="card">
            <div className="row between wrap">
              <h3>1 · Kelimeler</h3>
              <button
                className="btn"
                onClick={() => setCards((cs) => [...cs, ...data.vocab.map((v) => newCard(lang, v)).filter((c) => !existing.has(c.id))])}
              >
                ＋ Hepsini desteye ekle
              </button>
            </div>
            <div className="vocab">
              {data.vocab.map((v) => (
                <div key={v.word} className="vocab-item" onClick={() => narrator.say(v.word, lang, 0.85)}>
                  <b>{v.word}</b> {v.reading && v.reading !== v.word && <span className="muted">[{v.reading}]</span>}
                  <span>{v.translation}</span>
                  <small className="example">{v.example}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>2 · Konu anlatımı</h3>
            <Markdown text={data.explanation} />
          </section>

          <Dialogue lang={lang} lines={data.dialogue} free={data.source === "free"} />

          <section className="card">
            <h3>4 · Alıştırmalar (etkin hatırlama)</h3>
            {data.exercises.map((ex, i) => (
              <Exercise key={i} ex={ex} n={i + 1} lang={lang} />
            ))}
          </section>

          <Shadowing lang={lang} sentences={data.shadowing} />

          <button className="btn primary big" onClick={complete}>
            ✓ Üniteyi tamamla (+30 XP)
          </button>
        </>
      )}
    </div>
  );
}

function Dialogue({ lang, lines, free }: { lang: string; lines: LessonData["dialogue"]; free?: boolean }) {
  const voices = useVoices(lang);
  const [showTr, setShowTr] = useState(false);
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  function play() {
    const vs = voices.length > 1 ? [voices[0], voices[Math.min(1, voices.length - 1)]] : voices;
    narrator.play(
      lines.map((l) => {
        const k = speakers.indexOf(l.speaker);
        return { text: l.line, lang, voiceURI: vs[k % Math.max(1, vs.length)]?.voiceURI, pitch: k % 2 ? 0.85 : 1.08, rate: 0.9 };
      }),
      { title: "Diyalog", ownerId: "dialogue" },
    );
  }
  return (
    <section className="card">
      <div className="row between wrap">
        <h3>{free ? "3 · Gerçek örnek cümleler (Tatoeba)" : "3 · Diyalog (dinle → anla)"}</h3>
        <div className="row">
          <button className="btn" onClick={play}>{free ? "🎧 Cümleleri dinle" : "🎧 Diyaloğu dinle"}</button>
          <button className="btn ghost" onClick={() => setShowTr(!showTr)}>{showTr ? "Çeviriyi gizle" : "Çeviriyi göster"}</button>
        </div>
      </div>
      <div className="dialogue">
        {lines.map((l, i) => (
          <div key={i} className={`bubble ${speakers.indexOf(l.speaker) % 2 ? "right" : ""}`} onClick={() => narrator.say(l.line, lang, 0.9)}>
            <small>{l.speaker}</small>
            <div>{l.line}</div>
            {showTr && <div className="muted small">{l.translation}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Exercise({ ex, n, lang }: { ex: LessonData["exercises"][number]; n: number; lang: string }) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const norm = (s: string) => s.trim().toLowerCase().replace(/[.!?¡¿。]/g, "");
  const ok = ex.kind === "translate" ? similarity(val, ex.answer) > 0.7 : norm(val) === norm(ex.answer);
  return (
    <div className={`exercise ${checked ? (ok ? "ok" : "bad") : ""}`}>
      <p>
        <b>{n}.</b> {ex.prompt}
      </p>
      {ex.kind === "order" ? (
        <WordOrder ex={ex} done={checked} onDone={(good) => (setVal(good ? ex.answer : "x"), setChecked(true), good && addXp(3))} />
      ) : ex.kind === "mcq" && ex.options.length ? (
        <div className="options">
          {ex.options.map((o) => (
            <button
              key={o}
              className={`opt ${val === o ? "sel" : ""} ${checked && norm(o) === norm(ex.answer) ? "right" : ""}`}
              onClick={() => {
                setVal(o);
                setChecked(true);
                if (norm(o) === norm(ex.answer)) addXp(3);
              }}
              disabled={checked}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="row">
          <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setChecked(true)} disabled={checked} placeholder="Cevabın…" />
          {!checked && (
            <button className="btn" onClick={() => (setChecked(true), ok && addXp(3))}>
              Kontrol et
            </button>
          )}
        </div>
      )}
      {checked && (
        <div className="feedback">
          {ok ? "✅ Doğru! " : "❌ Doğru cevap: "}
          {!ok && <b onClick={() => narrator.say(ex.answer, lang)}>{ex.answer} </b>}
          <span className="muted">{ex.explanation}</span>
          {!ok && (
            <button className="btn ghost small" onClick={() => (setChecked(false), setVal(""))}>
              Tekrar dene
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WordOrder({ ex, done, onDone }: { ex: LessonData["exercises"][number]; done: boolean; onDone: (good: boolean) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, "").trim();
  const sentence = picked.map((i) => ex.options[i]).join(" ");
  return (
    <div className="order">
      <div className="order-line">{sentence || <span className="muted">Kelimelere sırayla dokun…</span>}</div>
      <div className="options">
        {ex.options.map((w, i) => (
          <button key={i} className="opt" disabled={done || picked.includes(i)} onClick={() => setPicked([...picked, i])}>
            {w}
          </button>
        ))}
      </div>
      {!done && (
        <div className="row">
          <button className="btn ghost small" onClick={() => setPicked(picked.slice(0, -1))} disabled={!picked.length}>
            ← Geri al
          </button>
          <button className="btn small" disabled={picked.length !== ex.options.length} onClick={() => onDone(norm(sentence) === norm(ex.answer))}>
            Kontrol et
          </button>
        </div>
      )}
    </div>
  );
}

export function Shadowing({ lang, sentences }: { lang: string; sentences: string[] }) {
  const [scores, setScores] = useState<Record<number, { score: number; heard: string }>>({});
  const [active, setActive] = useState<number | null>(null);
  const [err, setErr] = useState("");
  async function record(i: number) {
    setErr("");
    setActive(i);
    try {
      const heard = await listen(lang).promise;
      const score = Math.round(similarity(heard, sentences[i]) * 100);
      setScores((s) => ({ ...s, [i]: { score, heard } }));
      if (score >= 70) addXp(2);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setActive(null);
    }
  }
  return (
    <section className="card">
      <h3>5 · Gölgeleme (dinle & tekrar et)</h3>
      <p className="muted small">Cümleyi dinle, hemen ardından aynı ritim ve tonlamayla yüksek sesle tekrar et. 🎙 ile telaffuzun puanlanır.</p>
      {!canRecognize() && <p className="muted small">Bu tarayıcı konuşma tanımayı desteklemiyor; dinleyip sesli tekrar ederek yine çalışabilirsin.</p>}
      {err && <div className="error">{err}</div>}
      {sentences.map((s, i) => (
        <div key={i} className="shadow-row">
          <button className="icon" onClick={() => narrator.say(s, lang, 0.85)} aria-label="Dinle">🔊</button>
          <button className="icon" onClick={() => narrator.say(s, lang, 0.6)} aria-label="Yavaş dinle">🐢</button>
          <span className="grow">{s}</span>
          {canRecognize() && (
            <button className="icon" onClick={() => record(i)} disabled={active !== null} aria-label="Kaydet">
              {active === i ? "⏺" : "🎙"}
            </button>
          )}
          {scores[i] && (
            <span className={`score ${scores[i].score >= 85 ? "good" : scores[i].score >= 60 ? "mid" : "low"}`} title={`Duyulan: ${scores[i].heard}`}>
              {scores[i].score}%
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

export function Courses({ lang, initial }: { lang: string; initial?: { course: string; unit?: number } }) {
  const [progress] = useProgress();
  const [courseId, setCourseId] = useState<string | null>(initial?.course || null);
  const [open, setOpen] = useState<number | null>(initial?.unit !== undefined ? initial.unit : null);
  useEffect(() => {
    if (initial) {
      setCourseId(initial.course);
      setOpen(initial.unit ?? null);
    }
  }, [initial]);
  const course = COURSES.find((c) => c.id === courseId);

  if (course && open !== null && course.units[open])
    return (
      <LessonView
        lang={lang}
        level={course.lessonLevel}
        topic={course.units[open]}
        heading={`${course.icon} ${course.name} · Ders ${open + 1}`}
        courseFocus={course.focus}
        doneKey={`${lang}|course:${course.id}|${open}`}
        unitKey={`course:${course.id}:${open}`}
        cacheKey={`course|${lang}|${course.id}|${open}`}
        onBack={() => setOpen(null)}
        onNext={() => setOpen(open + 1 < course.units.length ? open + 1 : null)}
      />
    );

  if (course) {
    const done = course.units.filter((_, i) => progress.doneUnits[`${lang}|course:${course.id}|${i}`]).length;
    return (
      <div className="stack">
        <button className="btn ghost self-start" onClick={() => setCourseId(null)}>← Kurslar</button>
        <div className="card">
          <h2>{course.icon} {courseName(course, lang)}</h2>
          <p>{course.desc}</p>
          <p className="muted small">Önerilen seviye: {course.level} · {done}/{course.units.length} ders tamamlandı</p>
          <div className="progressbar"><div style={{ width: `${(done / course.units.length) * 100}%` }} /></div>
        </div>
        <ol className="path">
          {course.units.map((u, i) => {
            const isDone = progress.doneUnits[`${lang}|course:${course.id}|${i}`];
            return (
              <li key={u}>
                <button className={`unit ${isDone ? "done" : ""}`} onClick={() => setOpen(i)}>
                  <span className="unit-num">{isDone ? "✓" : i + 1}</span>
                  <span>{u}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted">Seviye müfredatına ek olarak, belirli bir beceriye odaklanan kurslar. Her ders: doğal kelime ve kalıplar, açıklama, diyalog, alıştırmalar ve gölgeleme.</p>
      <div className="grid2">
        {COURSES.map((c) => {
          const done = c.units.filter((_, i) => progress.doneUnits[`${lang}|course:${c.id}|${i}`]).length;
          return (
            <button key={c.id} className="card course" onClick={() => (setCourseId(c.id), setOpen(null))}>
              <div className="big-icon">{c.icon}</div>
              <h3>{courseName(c, lang)}</h3>
              <p className="small">{c.desc}</p>
              <div className="row between small muted">
                <span>{c.level}</span>
                <span>{done}/{c.units.length} ders</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
