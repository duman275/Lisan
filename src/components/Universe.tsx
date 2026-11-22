import { useState } from "react";
import { narrator, nativeCode } from "../lib/tts";
import { useSettings } from "../lib/store";
import {
  ADAPTATIONS,
  AUTHOR,
  CHANNELS,
  INTERVIEW_TOPICS,
  MAIN_BOOKS,
  SIDE_BOOKS,
  SYMBOLS,
  THEMES,
  THEORIES,
  TWOW_CHAPTERS,
  WIKIS,
  ytSearch,
  type UBook,
  type UTopic,
} from "../data/asoiaf";
import { Segmented, useNav } from "./common";

type Sec = "books" | "twow" | "side" | "symbols" | "themes" | "theories" | "interviews" | "sources";

const SECS: { id: Sec; label: string }[] = [
  { id: "books", label: "📚 5 kitap" },
  { id: "twow", label: "❄️ Kış Rüzgârları" },
  { id: "side", label: "📜 Yan kitaplar & diziler" },
  { id: "symbols", label: "🐺 Semboller" },
  { id: "themes", label: "🎭 Temalar" },
  { id: "theories", label: "🔮 Teoriler" },
  { id: "interviews", label: "🎙 Yazar söyleşileri" },
  { id: "sources", label: "🌐 Kaynaklar" },
];

export const ASOIAF_SOURCE_HINTS = [
  "the five published novels and the released The Winds of Winter sample chapters",
  "Fire & Blood, The World of Ice & Fire, the Dunk and Egg novellas",
  "George R. R. Martin's interviews (So Spake Martin archive at westeros.org, his Not a Blog)",
  "A Wiki of Ice and Fire (awoiaf.westeros.org) and the Game of Thrones Fandom wiki",
  "Reddit r/asoiaf discussions and fan theories",
  "the HBO series Game of Thrones and House of the Dragon (clearly separating show-only events from the books)",
  "YouTube analysis channels: Alt Shift X, History of Westeros, Preston Jacobs, and Turkish channels Geek Teori, Karakare, Legendarium Türkiye, 40ip, Argümento, Umur Tezer — mention a specific video only if you actually found it, never invent titles",
];

export function Universe({ onBack }: { onBack: () => void }) {
  const [sec, setSec] = useState<Sec>("books");
  const [spoilers, setSpoilers] = useState(false);
  return (
    <div className="stack">
      <button className="btn ghost self-start" onClick={onBack}>
        ← Efsaneler
      </button>
      <div className="card universe-hero">
        <h2>🐺🐉 Buz ve Ateşin Şarkısı Evreni</h2>
        <p className="small">
          {AUTHOR}'ın <i>A Song of Ice and Fire</i> serisi: yayınlanan 5 kitap, Kış Rüzgârları'nın açıklanan bölümleri, yan kitaplar, diziler, yazar söyleşileri,
          semboller, temalar ve teoriler. Her konuda AWOIAF, Fandom, r/asoiaf ve Türkçe YouTube kanallarına (Geek Teori, Karakare, Legendarium Türkiye, 40ip,
          Argümento, Umur Tezer) doğrudan geçebilir ya da yapay zekâyla kaynaklı derin analiz alabilirsin.
        </p>
        <p className="muted small">Kitaplar telifli olduğundan tam metinleri uygulamada yok; buradaki metinler kısa tanıtımlardır.</p>
        <label className="check">
          <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} /> ⚠️ Spoilerları göster
        </label>
      </div>
      <Segmented value={sec} options={SECS} onChange={setSec} />
      {sec === "books" && <BookList books={MAIN_BOOKS} />}
      {sec === "twow" && (
        <>
          <div className="card small">
            <b>The Winds of Winter (Kış Rüzgârları)</b> henüz yayınlanmadı. Aşağıdakiler yazarın sitesinde yayımlanan ya da etkinliklerde okunan örnek bölümlerdir
            (ayrıntılar için A Wiki of Ice and Fire'daki “The Winds of Winter” sayfasına bak).
          </div>
          <Topics items={TWOW_CHAPTERS} spoilers={spoilers} />
        </>
      )}
      {sec === "side" && (
        <>
          <h3>Yan kitaplar</h3>
          <BookList books={SIDE_BOOKS} />
          <h3>Diziler</h3>
          <BookList books={ADAPTATIONS} />
        </>
      )}
      {sec === "symbols" && <Topics items={SYMBOLS} spoilers={spoilers} />}
      {sec === "themes" && <Topics items={THEMES} spoilers={spoilers} />}
      {sec === "theories" && <Topics items={THEORIES} spoilers={spoilers} />}
      {sec === "interviews" && <Topics items={INTERVIEW_TOPICS} spoilers={spoilers} />}
      {sec === "sources" && <Sources />}
    </div>
  );
}

function BookList({ books }: { books: UBook[] }) {
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
            <button className="btn small" onClick={() => go({ tab: "summary", prefill: { title: b.title, author: AUTHOR, auto: true } })}>
              🧾 Özet
            </button>
            <button
              className="btn small"
              onClick={() => go({ tab: "analysis", prefill: { title: b.title, author: AUTHOR, auto: true, hints: ASOIAF_SOURCE_HINTS } })}
            >
              🔎 Analiz
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Topics({ items, spoilers }: { items: UTopic[]; spoilers: boolean }) {
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
                    prefill: { title: "A Song of Ice and Fire", author: AUTHOR, topic: `${t.title} (${t.en})`, auto: true, hints: ASOIAF_SOURCE_HINTS },
                  })
                }
              >
                🔎 Derin analiz (kaynaklı)
              </button>
            </div>
            <details className="links">
              <summary>Kaynaklarda aç: wiki, Reddit, YouTube kanalları</summary>
              <div className="chips">
                {WIKIS.map((w) => (
                  <a key={w.name} className="chip" href={w.url(t.en)} target="_blank" rel="noreferrer noopener">
                    {w.name}
                  </a>
                ))}
                {CHANNELS.map((c) => (
                  <a key={c.name} className="chip" href={ytSearch(c.name, t.title, t.en)} target="_blank" rel="noreferrer noopener">
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

function Sources() {
  return (
    <div className="stack">
      <div className="card">
        <h3>Wiki ve topluluklar</h3>
        <ul className="small">
          <li>
            <a href="https://awoiaf.westeros.org" target="_blank" rel="noreferrer noopener">A Wiki of Ice and Fire</a> — kitap odaklı, bölüm bölüm kaynaklı ansiklopedi
          </li>
          <li>
            <a href="https://gameofthrones.fandom.com" target="_blank" rel="noreferrer noopener">Game of Thrones Fandom Wiki</a> — dizi ve kitaplar
          </li>
          <li>
            <a href="https://www.reddit.com/r/asoiaf/" target="_blank" rel="noreferrer noopener">r/asoiaf</a> — teoriler ve tartışmalar
          </li>
          <li>
            <a href="https://www.westeros.org/Citadel/SSM/" target="_blank" rel="noreferrer noopener">So Spake Martin</a> — yazarın söyleşi ve yanıtları arşivi
          </li>
          <li>
            <a href="https://georgerrmartin.com/notablog/" target="_blank" rel="noreferrer noopener">Not a Blog</a> — G.R.R. Martin'in kendi blogu
          </li>
        </ul>
      </div>
      <div className="card">
        <h3>YouTube kanalları</h3>
        <div className="chips">
          {CHANNELS.map((c) => (
            <a key={c.name} className="chip" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(c.name + " Game of Thrones")}`} target="_blank" rel="noreferrer noopener">
              {c.lang === "tr" ? "🇹🇷" : "🇬🇧"} {c.name}
            </a>
          ))}
        </div>
        <p className="muted small">Bağlantılar kanalı ve konuyu YouTube'da arar. Yapay zekâ videoları izleyemez; analizde yalnızca web aramasında gerçekten bulduğu kaynakları anar.</p>
      </div>
    </div>
  );
}
