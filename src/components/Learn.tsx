import { useMemo } from "react";
import { useCards, useProgress, useSettings, today } from "../lib/store";
import { DAILY_PLAN, METHOD } from "../data/curriculum";
import { langByCode, LANGUAGES, LEVEL_INFO, type Level } from "../data/languages";
import { AiNotice, Segmented, useNav } from "./common";
import { Flashcards } from "./Flashcards";
import { Courses, Path } from "./Lesson";
import { Placement, Story, Tutor } from "./Practice";

type Sub = "today" | "path" | "courses" | "cards" | "story" | "tutor" | "test" | "method";

const SUBS: { id: Sub; label: string }[] = [
  { id: "today", label: "Bugün" },
  { id: "path", label: "Müfredat" },
  { id: "courses", label: "Kurslar" },
  { id: "cards", label: "Kartlar" },
  { id: "story", label: "Hikâye" },
  { id: "tutor", label: "Öğretmen" },
  { id: "test", label: "Seviye testi" },
  { id: "method", label: "Yöntem" },
];

export function Learn() {
  const { route, go } = useNav();
  const [settings, setSettings] = useSettings();
  const sub = (route.learnSub as Sub) || "today";
  const setSub = (s: Sub) => go({ tab: "learn", learnSub: s });
  const lang = settings.targetLang;
  const level = (settings.levels[lang] as Level) || "A1";
  const setLevel = (l: Level) => setSettings((s) => ({ ...s, levels: { ...s.levels, [lang]: l } }));

  return (
    <div className="stack">
      <div className="row wrap between">
        <div className="lang-picker" role="listbox" aria-label="Öğrenilen dil">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={l.code === lang ? "on" : ""}
              onClick={() => setSettings((s) => ({ ...s, targetLang: l.code }))}
              title={l.label}
              aria-selected={l.code === lang}
            >
              <span>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      </div>
      <AiNotice />
      <Segmented value={sub} options={SUBS} onChange={setSub} />
      {sub === "today" && <Today lang={lang} level={level} onGo={setSub} />}
      {sub === "path" && <Path lang={lang} level={level} setLevel={setLevel} />}
      {sub === "courses" && <Courses lang={lang} initial={route.course} />}
      {sub === "cards" && <Flashcards lang={lang} level={level} />}
      {sub === "story" && <Story lang={lang} level={level} />}
      {sub === "tutor" && <Tutor lang={lang} level={level} />}
      {sub === "test" && <Placement lang={lang} onResult={(l) => (setLevel(l), setSub("path"))} />}
      {sub === "method" && <Method lang={lang} />}
    </div>
  );
}

function Today({ lang, level, onGo }: { lang: string; level: Level; onGo: (s: Sub) => void }) {
  const [progress] = useProgress();
  const [cards] = useCards();
  const [settings] = useSettings();
  const l = langByCode(lang);
  const now = Date.now();
  const due = cards.filter((c) => c.lang === lang && c.due <= now).length;
  const todayXp = progress.days[today()] || 0;
  const week = useMemo(() => {
    const out: { d: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(now - i * 86_400_000);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      out.push({ d: dt.toLocaleDateString("tr-TR", { weekday: "short" }), xp: progress.days[k] || 0 });
    }
    return out;
  }, [progress.days, now]);
  const maxXp = Math.max(30, ...week.map((w) => w.xp));
  const info = LEVEL_INFO[level];

  return (
    <div className="stack">
      <div className="grid2">
        <div className="card hero">
          <div className="muted">{l.flag} {l.label} · seviye</div>
          <div className="level">{level} <small>{info.name}</small></div>
          <p>{info.can}</p>
          <p className="muted small">Hedef kelime dağarcığı: {info.words}</p>
          <div className="row wrap">
            <button className="btn" onClick={() => onGo("test")}>Seviyemi ölç</button>
            <button className="btn primary" onClick={() => onGo("path")}>Derse devam et →</button>
          </div>
        </div>
        <div className="card">
          <div className="stats">
            <div><b>🔥 {progress.streak}</b><span>gün seri</span></div>
            <div><b>{todayXp}</b><span>bugün XP</span></div>
            <div><b>{progress.xp}</b><span>toplam XP</span></div>
            <div><b>{due}</b><span>bekleyen kart</span></div>
          </div>
          <div className="bars" aria-label="Son 7 gün XP">
            {week.map((w, i) => (
              <div key={i} className="bar">
                <div style={{ height: `${(w.xp / maxXp) * 100}%` }} title={`${w.xp} XP`} />
                <span>{w.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Bugünün planı · {settings.dailyGoal} dakika</h3>
        <p className="muted small">Bilimsel olarak en verimli karışım: tekrar + yeni girdi + konuşma. Her gün yapmak, haftada bir uzun çalışmaktan çok daha etkilidir.</p>
        <ol className="plan">
          {DAILY_PLAN.map((p) => (
            <li key={p.what}>
              <button className="unit" onClick={() => onGo(p.tab as Sub)}>
                <span className="unit-num">{p.min}′</span>
                <span>{p.what}{p.tab === "cards" && due ? ` — ${due} kart seni bekliyor` : ""}</span>
              </button>
            </li>
          ))}
          <li>
            <button className="unit" onClick={() => onGo("courses")}>
              <span className="unit-num">🎤</span>
              <span>Kurslar: Günlük Konuşma, Konuşma Akıcılığı, Native gibi konuş, İş Dili</span>
            </button>
          </li>
          <li>
            <span className="unit static">
              <span className="unit-num">＋</span>
              <span>Boş zamanda: Kütüphane'den seviyene uygun bir kitabı podcast gibi dinle (yürürken, yolda).</span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function Method({ lang }: { lang: string }) {
  const l = langByCode(lang);
  const daily = 1; // saat
  const days = Math.round(l.fsiHours / daily);
  return (
    <div className="stack">
      <div className="card">
        <h3>En kısa sürede en verimli öğrenme sistemi</h3>
        <p>
          Lisan, dil ediniminde etkisi en çok kanıtlanmış altı yöntemi tek bir günlük akışta birleştirir. Amaç: ezber değil, <b>anlamak ve konuşmak</b>.
        </p>
      </div>
      <div className="grid3">
        {METHOD.map((m) => (
          <div key={m.title} className="card">
            <div className="big-icon">{m.icon}</div>
            <h4>{m.title}</h4>
            <p className="small">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>{l.flag} {l.label} için gerçekçi takvim</h3>
        <p>
          ABD Dışişleri Enstitüsü (FSI) verilerine göre bu dil için ileri seviyeye (B2–C1) yaklaşık <b>{l.fsiHours} saat</b> yoğun çalışma gerekir. Günde {daily} saat ile ≈ <b>{Math.round(days / 30)} ay</b>.
          Aralıklı tekrar ve anlaşılır girdi bu süreyi belirgin biçimde kısaltır; Türkçe konuşanlar için dil ailesine göre süre değişebilir.
        </p>
        <ul>
          <li><b>A1→A2 (0–3. ay):</b> En sık 1.000 kelime, temel kalıplar, günde 15 kart + kısa hikâyeler.</li>
          <li><b>B1 (3–8. ay):</b> 2.000+ kelime, seviyeli kitaplar ve podcast dinleme, öğretmenle haftada 3+ sohbet.</li>
          <li><b>B2 (8–14. ay):</b> Orijinal dizi/film, efsane kitapları dinleyerek okuma, yazma pratiği.</li>
          <li><b>C1–C2:</b> Edebî analiz, münazara, uzmanlık alanında okuma ve üslup çalışmaları.</li>
        </ul>
      </div>
    </div>
  );
}
