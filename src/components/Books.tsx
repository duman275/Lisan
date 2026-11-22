import { useEffect, useMemo, useState } from "react";
import { useLibrary, useSettings } from "../lib/store";
import { nativeCode } from "../lib/tts";
import { CATALOG, type CatalogBook } from "../data/catalog";
import { AiNotice, AiOutput, useHealth, useNav, useStream } from "./common";
import { openGutenberg } from "./Library";

// ---------- Efsane kitaplar kataloğu ----------

export function Catalog() {
  const { go } = useNav();
  const [cat, setCat] = useState(CATALOG[0].id);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const lib = useLibrary();

  const list = useMemo(() => {
    if (q.trim()) {
      const s = q.toLocaleLowerCase("tr");
      return CATALOG.flatMap((c) => c.books).filter((b) => `${b.title} ${b.original || ""} ${b.author}`.toLocaleLowerCase("tr").includes(s));
    }
    return CATALOG.find((c) => c.id === cat)!.books;
  }, [cat, q]);

  async function read(b: CatalogBook) {
    if (!b.gid) return;
    const id = `pg-${b.gid}`;
    if (lib.some((x) => x.id === id)) return go({ tab: "library", readerId: id });
    setBusy(b.title);
    setErr("");
    try {
      go({ tab: "library", readerId: await openGutenberg(b.gid, { title: b.title, author: b.author }) });
    } catch (e) {
      setErr(`${b.title}: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Efsane Kitaplar</h2>
        <p className="muted">Türlerin zirvesindeki kitaplar. 📗 işaretliler telifsizdir: uygulamada tam metin okunur ve sesli dinlenir. Hepsi için özet, sesli özet ve derin analiz alabilirsin.</p>
        <input placeholder="Katalogda ara: kitap ya da yazar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!q && (
        <div className="cats">
          {CATALOG.map((c) => (
            <button key={c.id} className={`cat ${c.id === cat ? "on" : ""}`} onClick={() => setCat(c.id)}>
              <span>{c.icon}</span> {c.name} <small>{c.books.length}</small>
            </button>
          ))}
        </div>
      )}
      {err && <div className="error">{err}</div>}
      <div className="books">
        {list.map((b) => (
          <div key={b.title + b.author} className="book card">
            <div className="book-top">
              <div className="book-spine" style={{ background: spineColor(b.title) }}>{b.title.slice(0, 1)}</div>
              <div>
                <h4>{b.title}</h4>
                {b.original && b.original !== b.title && <div className="muted small">{b.original}</div>}
                <div className="small">{b.author} · {b.year}</div>
              </div>
            </div>
            <p className="small">{b.note}</p>
            <div className="row wrap">
              {b.gid ? (
                <button className="btn primary small" disabled={busy === b.title} onClick={() => read(b)}>
                  {busy === b.title ? "İndiriliyor…" : "📗 Oku & dinle"}
                </button>
              ) : (
                <span className="pill muted">© telifli</span>
              )}
              <button className="btn small" onClick={() => go({ tab: "summary", prefill: { title: b.original || b.title, author: b.author, auto: true } })}>🧾 Özet</button>
              <button className="btn small" onClick={() => go({ tab: "analysis", prefill: { title: b.original || b.title, author: b.author, auto: true } })}>🔎 Analiz</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function spineColor(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 42%)`;
}

// ---------- Özetler ----------

const SUMMARY_MODES = [
  { id: "kisa", label: "5 dakikada (sesli özet)" },
  { id: "detayli", label: "Bölüm bölüm detaylı" },
  { id: "karakterler", label: "Karakter rehberi" },
  { id: "fikirler", label: "Ana fikirler & dersler" },
];

export function Summary() {
  const { route } = useNav();
  const [settings] = useSettings();
  const health = useHealth();
  const s = useStream();
  const [title, setTitle] = useState(route.prefill?.title || "");
  const [author, setAuthor] = useState(route.prefill?.author || "");
  const [mode, setMode] = useState(route.prefill?.mode || "kisa");

  const run = (t = title, a = author, m = mode) => s.run({ task: "summary", title: t, author: a, mode: m, nativeLang: settings.nativeLang });

  useEffect(() => {
    if (route.prefill?.auto && route.prefill.title && health.ai) {
      setTitle(route.prefill.title);
      setAuthor(route.prefill.author || "");
      void run(route.prefill.title, route.prefill.author || "", mode);
    }
  }, [route.prefill, health.ai]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <AiNotice />
      <div className="card">
        <h2>Kitap Özetleri</h2>
        <p className="muted">Herhangi bir kitabın dinlemeye uygun özetini al; podcast gibi dinle, kütüphanene kaydet. Kendi PDF'ini özetlemek için Kütüphane → kitabı aç → “Tamamını özetle”.</p>
        <form className="row wrap" onSubmit={(e) => (e.preventDefault(), run())}>
          <input placeholder="Kitap adı" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Yazar (isteğe bağlı)" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Özet türü">
            {SUMMARY_MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button className="btn primary" disabled={!title.trim() || s.loading || !health.ai}>Özetle</button>
        </form>
      </div>
      <AiOutput s={s} title={`${title} — özet`} kind="summary" lang={nativeCode(settings.nativeLang)} />
    </div>
  );
}

// ---------- Edebi analiz ----------

const FOCUS = [
  { id: "symbolism and motifs", label: "Semboller & motifler" },
  { id: "main themes", label: "Temalar" },
  { id: "subtext and what is left unsaid", label: "Alt metin" },
  { id: "character archetypes and psychology", label: "Karakter psikolojisi" },
  { id: "the author's own statements in interviews, letters and essays", label: "Yazarın söyleşileri" },
  { id: "historical, political and biographical context", label: "Tarihsel bağlam" },
  { id: "film, TV series and stage adaptations and how they reinterpret the book", label: "Film & dizi uyarlamaları" },
  { id: "community interpretations and fan theories from Reddit, fandom wikis and Goodreads", label: "Reddit & fandom teorileri" },
  { id: "influence on later literature and pop culture", label: "Etkileri & göndermeler" },
  { id: "narrative technique, structure and style", label: "Anlatım tekniği" },
];

export function Analysis() {
  const { route } = useNav();
  const [settings] = useSettings();
  const health = useHealth();
  const s = useStream();
  const [title, setTitle] = useState(route.prefill?.title || "");
  const [author, setAuthor] = useState(route.prefill?.author || "");
  const [passage, setPassage] = useState(route.prefill?.text || "");
  const [focus, setFocus] = useState<string[]>(FOCUS.slice(0, 3).map((f) => f.id).concat(FOCUS[4].id, FOCUS[6].id, FOCUS[7].id));

  const run = (t = title, a = author) =>
    s.run({ task: "analysis", title: t, author: a, focus, text: passage || undefined, nativeLang: settings.nativeLang });

  useEffect(() => {
    if (route.prefill) {
      setTitle(route.prefill.title || "");
      setAuthor(route.prefill.author || "");
      setPassage(route.prefill.text || "");
      if (route.prefill.auto && route.prefill.title && health.ai) void run(route.prefill.title, route.prefill.author || "");
    }
  }, [route.prefill, health.ai]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <AiNotice />
      <div className="card">
        <h2>Derin Analiz: Sembolizm, Temalar, Alt Metin</h2>
        <p className="muted">
          Yapay zekâ önce web'de araştırır: yazar söyleşileri, yayımlanmış eleştiriler, film/dizi uyarlamaları, Reddit tartışmaları ve fandom wiki'leri. Sonra metnin
          gösterdiklerini, yazarın söylediklerini, akademik yorumları ve hayran teorilerini ayrı ayrı, kaynaklarıyla anlatır.
        </p>
        <form className="stack" onSubmit={(e) => (e.preventDefault(), run())}>
          <div className="row wrap">
            <input placeholder="Kitap / roman adı" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input placeholder="Yazar" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="chips">
            {FOCUS.map((f) => (
              <button
                type="button"
                key={f.id}
                className={`chip ${focus.includes(f.id) ? "on" : ""}`}
                onClick={() => setFocus((x) => (x.includes(f.id) ? x.filter((y) => y !== f.id) : [...x, f.id]))}
              >
                {f.label}
              </button>
            ))}
          </div>
          <details>
            <summary>Belirli bir pasajı analiz ettir (isteğe bağlı)</summary>
            <textarea rows={5} value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Kitaptan bir bölüm yapıştır…" />
          </details>
          <div>
            <button className="btn primary" disabled={!title.trim() || s.loading || !health.ai}>🔎 Araştır ve analiz et</button>
            <span className="muted small"> · Web araştırması 1–3 dakika sürebilir.</span>
          </div>
        </form>
      </div>
      <AiOutput s={s} title={`${title} — analiz`} kind="analysis" lang={nativeCode(settings.nativeLang)} />
    </div>
  );
}
