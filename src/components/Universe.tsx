import { useState } from "react";
import { narrator, nativeCode } from "../lib/tts";
import { useSettings } from "../lib/store";
import type { UBook, UniverseData, UTopic } from "../data/universes";
import { ytSearch } from "../data/universes/types";
import { Segmented, useNav } from "./common";

/** Bir evrenin (ASOIAF, Orta Dünya, Dune…) kitapları, uyarlamaları, sembolleri, temaları, teorileri ve kaynakları. */
export function Universe({ u, onBack }: { u: UniverseData; onBack: () => void }) {
  const [sec, setSec] = useState(u.sections[0].id);
  const [spoilers, setSpoilers] = useState(false);
  const section = u.sections.find((s) => s.id === sec);
  return (
    <div className="stack">
      <button className="btn ghost self-start" onClick={onBack}>
        ← Efsaneler
      </button>
      <div className="card universe-hero">
        <h2>
          {u.icon} {u.title}
        </h2>
        <p className="small">{u.intro}</p>
        <p className="small">
          Her konuda wiki, fandom, Reddit ve YouTube kanallarına (Geek Teori, Karakare, Legendarium Türkiye, 40ip, Argümento, Umur Tezer…) doğrudan geçebilir ya da
          yapay zekâyla kaynaklı derin analiz alabilirsin.
        </p>
        <p className="muted small">{u.copyrightNote}</p>
        <label className="check">
          <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} /> ⚠️ Spoilerları göster
        </label>
      </div>
      <Segmented value={sec} options={[...u.sections.map((s) => ({ id: s.id, label: s.label })), { id: "sources", label: "🌐 Kaynaklar" }]} onChange={setSec} />
      {section?.intro && <div className="card small">{section.intro}</div>}
      {section?.kind === "books" &&
        section.groups.map((g, i) => (
          <div key={i} className="stack">
            {g.title && <h3>{g.title}</h3>}
            <BookList u={u} books={g.books} />
          </div>
        ))}
      {section?.kind === "topics" && <Topics u={u} items={section.items} spoilers={spoilers} />}
      {sec === "sources" && <Sources u={u} />}
    </div>
  );
}

function BookList({ u, books }: { u: UniverseData; books: UBook[] }) {
  const { go } = useNav();
  return (
    <div className="books">
      {books.map((b) => (
        <div key={b.title} className="book card">
          <h4>{b.tr}</h4>
          <div className="muted small">
            {b.title} · {b.year}
          </div>
          <p className="small">{b.note}</p>
          <div className="row wrap">
            <button className="btn small" onClick={() => go({ tab: "summary", prefill: { title: b.title, author: u.author, auto: true } })}>
              🧾 Özet
            </button>
            <button className="btn small" onClick={() => go({ tab: "analysis", prefill: { title: b.title, author: u.author, auto: true, hints: u.hints } })}>
              🔎 Analiz
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Topics({ u, items, spoilers }: { u: UniverseData; items: UTopic[]; spoilers: boolean }) {
  const { go } = useNav();
  const [settings] = useSettings();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="topics">
      {items.map((t) => {
        const hidden = t.spoiler && !spoilers && !open[t.id];
        return (
          <div key={t.id} className="card topic">
            <div className="row between wrap">
              <h4>{t.title}</h4>
              <div className="row">
                {t.status && <span className="pill">{t.status}</span>}
                {t.spoiler && <span className="pill warn">⚠️ spoiler</span>}
              </div>
            </div>
            {hidden ? (
              <button className="btn ghost small" onClick={() => setOpen({ ...open, [t.id]: true })}>
                Spoiler içerir — göster
              </button>
            ) : (
              <p className="small">{t.text}</p>
            )}
            <div className="row wrap">
              {!hidden && (
                <button className="btn small" onClick={() => narrator.say(`${t.title}. ${t.text}`, nativeCode(settings.nativeLang))}>
                  🎧 Dinle
                </button>
              )}
              <button
                className="btn small primary"
                onClick={() =>
                  go({
                    tab: "analysis",
                    prefill: { title: u.analysisTitle, author: u.author, topic: `${t.title} (${t.en})`, auto: true, hints: u.hints },
                  })
                }
              >
                🔎 Derin analiz (kaynaklı)
              </button>
            </div>
            <details className="links">
              <summary>Kaynaklarda aç: wiki, Reddit, YouTube kanalları</summary>
              <div className="chips">
                {u.wikis.map((w) => (
                  <a key={w.name} className="chip" href={w.url(t.en)} target="_blank" rel="noreferrer noopener">
                    {w.name}
                  </a>
                ))}
                {u.channels.map((c) => (
                  <a key={c.name} className="chip" href={ytSearch(c, t.title, t.en, u.analysisTitle)} target="_blank" rel="noreferrer noopener">
                    ▶ {c.name}
                  </a>
                ))}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function Sources({ u }: { u: UniverseData }) {
  return (
    <div className="stack">
      <div className="card">
        <h3>Wiki ve topluluklar</h3>
        <ul className="small">
          {u.homepages.map((h) => (
            <li key={h.url}>
              <a href={h.url} target="_blank" rel="noreferrer noopener">
                {h.name}
              </a>{" "}
              — {h.note}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>YouTube kanalları</h3>
        <div className="chips">
          {u.channels.map((c) => (
            <a
              key={c.name}
              className="chip"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${c.name} ${u.analysisTitle}`)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {c.lang === "tr" ? "🇹🇷" : "🇬🇧"} {c.name}
            </a>
          ))}
        </div>
        <p className="muted small">Bağlantılar kanalı ve konuyu YouTube'da arar. Yapay zekâ videoları izleyemez; analizde yalnızca web aramasında gerçekten bulduğu kaynakları anar.</p>
      </div>
    </div>
  );
}
