import { useEffect, useMemo, useRef, useState } from "react";
import { jsonAI } from "../lib/api";
import { loadItem, savePosition, useSettings, type LibraryItem } from "../lib/store";
import { splitSentences } from "../lib/text";
import { narrator, nativeCode, useNarrator, useVoices, VOICE_PRESETS, type Segment } from "../lib/tts";
import { LANGUAGES } from "../data/languages";
import { AiOutput, useHealth, useNav, useStream } from "./common";
import { Clickable, WordPopup, type WordTarget } from "./WordPopup";

const PAGE = 40; // sayfa başına cümle

interface Podcast {
  title: string;
  turns: { speaker: "A" | "B"; text: string }[];
}

export function Reader({ id, onBack }: { id: string; onBack: () => void }) {
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  useEffect(() => {
    void loadItem(id).then((x) => setItem(x ?? null));
  }, [id]);
  if (item === undefined) return <div className="status"><span className="spinner" /> Yükleniyor…</div>;
  if (item === null)
    return (
      <div className="card">
        <p>Bu öğe bulunamadı.</p>
        <button className="btn" onClick={onBack}>← Kütüphane</button>
      </div>
    );
  return <ReaderInner item={item} onBack={onBack} />;
}

function ReaderInner({ item, onBack }: { item: LibraryItem; onBack: () => void }) {
  const [settings, setSettings] = useSettings();
  const { go, route } = useNav();
  const health = useHealth();
  const n = useNarrator();
  const [lang, setLang] = useState(item.lang || (item.kind === "pdf" || item.kind === "paste" ? guessLang(item.text) : nativeCode(settings.nativeLang)));
  const sentences = useMemo(() => splitSentences(item.text, lang), [item.text, lang]);
  const pages = Math.max(1, Math.ceil(sentences.length / PAGE));
  const [page, setPage] = useState(Math.min(pages - 1, Math.floor((item.position || 0) / PAGE)));
  const [tapMode, setTapMode] = useState<"word" | "seek">(item.kind === "gutenberg" || item.kind === "story" ? "word" : "seek");
  const [fontSize, setFontSize] = useState(19);
  const [target, setTarget] = useState<WordTarget | null>(null);
  const [panel, setPanel] = useState<"none" | "explain" | "podcast" | "summary">("none");
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [podErr, setPodErr] = useState("");
  const [podBusy, setPodBusy] = useState(false);
  const explain = useStream();
  const voices = useVoices(lang);
  const nativeVoices = useVoices(nativeCode(settings.nativeLang));
  const mine = n.ownerId === item.id;
  const lastSaved = useRef(0);
  const curRef = useRef<HTMLSpanElement>(null);

  // Okunan cümleyi takip et: sayfayı çevir, kaldığı yeri kaydet
  useEffect(() => {
    if (!mine) return;
    const p = Math.floor(n.index / PAGE);
    if (p !== page) setPage(p);
    if (Math.abs(n.index - lastSaved.current) >= 3) {
      lastSaved.current = n.index;
      void savePosition(item.id, n.index);
    }
  }, [mine, n.index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [n.index, page]);

  // Asistan/sesli komut "oku" dediyse otomatik başlat
  useEffect(() => {
    if (route.autoplay && route.readerId === item.id) {
      playFrom(mine ? n.index : item.position || 0);
      go({ ...route, autoplay: false });
    }
  }, [route.autoplay]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageSentences = sentences.slice(page * PAGE, (page + 1) * PAGE);
  const pageText = pageSentences.map((s) => s.text).join(" ");

  function playFrom(i: number) {
    const segs: Segment[] = sentences.map((s) => ({ text: s.text, lang }));
    narrator.play(segs, { start: i, title: item.title, ownerId: item.id });
  }

  async function makePodcast() {
    setPanel("podcast");
    setPodBusy(true);
    setPodErr("");
    setPodcast(null);
    try {
      // Mevcut sayfa + sonraki iki sayfa: bir bölüm büyüklüğünde metin
      const text = sentences.slice(page * PAGE, (page + 3) * PAGE).map((s) => s.text).join(" ");
      const p = await jsonAI<Podcast>({ task: "podcast", text, title: item.title, nativeLang: settings.nativeLang });
      setPodcast(p);
      playPodcast(p);
    } catch (e) {
      setPodErr((e as Error).message);
    } finally {
      setPodBusy(false);
    }
  }

  function playPodcast(p: Podcast) {
    const nl = nativeCode(settings.nativeLang);
    const a = settings.podcastVoiceA || nativeVoices[0]?.voiceURI;
    const b = settings.podcastVoiceB || nativeVoices[1]?.voiceURI || a;
    const sameVoice = a === b;
    narrator.play(
      p.turns.map((t) => ({
        text: t.text,
        lang: nl,
        voiceURI: t.speaker === "A" ? a : b,
        // Tek ses varsa iki sunucuyu perdeyle ayırt et
        pitch: sameVoice ? (t.speaker === "A" ? 1.12 : 0.82) : 1,
        label: t.speaker,
      })),
      { title: `🎙 ${p.title}`, ownerId: `pod:${item.id}` },
    );
  }

  const podOwner = n.ownerId === `pod:${item.id}`;

  return (
    <div className="reader">
      <div className="reader-head card">
        <div className="row between wrap">
          <button className="btn ghost" onClick={onBack}>← Kütüphane</button>
          <div className="grow">
            <h2>{item.title}</h2>
            {item.author && <div className="muted">{item.author}</div>}
          </div>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={() => (mine && (n.playing || n.paused) ? narrator.toggle() : playFrom(Math.max(page * PAGE, mine ? n.index : item.position || page * PAGE)))}>
            {mine && n.playing ? "⏸ Duraklat" : mine && n.paused ? "▶ Devam" : "🎧 Sesli dinle"}
          </button>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Metin dili">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
          <select
            value={voices.some((v) => v.voiceURI === settings.voiceURI) ? settings.voiceURI : ""}
            onChange={(e) => setSettings((s) => ({ ...s, voiceURI: e.target.value || undefined }))}
            aria-label="Ses"
          >
            <option value="">Otomatik ses</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
            ))}
          </select>
          <select
            onChange={(e) => {
              const p = VOICE_PRESETS.find((x) => x.id === e.target.value);
              if (p) setSettings((s) => ({ ...s, rate: p.rate, pitch: p.pitch }));
            }}
            value={VOICE_PRESETS.find((p) => p.rate === settings.rate && p.pitch === settings.pitch)?.id || ""}
            aria-label="Anlatım tarzı"
          >
            <option value="">Anlatım tarzı…</option>
            {VOICE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="segmented small">
            <button className={tapMode === "word" ? "on" : ""} onClick={() => setTapMode("word")} title="Dokunduğun kelimenin anlamını göster">Kelime anlamı</button>
            <button className={tapMode === "seek" ? "on" : ""} onClick={() => setTapMode("seek")} title="Dokunduğun cümleden okumaya başla">Buradan oku</button>
          </div>
          <button className="icon" onClick={() => setFontSize((f) => Math.max(14, f - 1))} aria-label="Yazıyı küçült">A−</button>
          <button className="icon" onClick={() => setFontSize((f) => Math.min(28, f + 1))} aria-label="Yazıyı büyüt">A+</button>
        </div>
        <div className="toolbar">
          <button
            className="btn"
            disabled={!health.ai}
            onClick={() => {
              setPanel("explain");
              void explain.run({ task: "explain", text: pageText, title: item.title, nativeLang: settings.nativeLang, mode: "Retell and explain this page so I can listen instead of reading." });
            }}
          >
            🧠 Bu sayfayı bana anlat
          </button>
          <button className="btn" disabled={!health.ai || podBusy} onClick={makePodcast}>
            {podBusy ? "Podcast hazırlanıyor…" : "🎙 Bu bölümü podcast yap"}
          </button>
          <button
            className="btn"
            disabled={!health.ai}
            onClick={() => {
              setPanel("summary");
              void explain.run({ task: "summary", text: item.text, title: item.title, nativeLang: settings.nativeLang, mode: "kisa" });
            }}
          >
            🧾 Tamamını özetle
          </button>
          <button className="btn" onClick={() => go({ tab: "analysis", prefill: { title: item.title, author: item.author, text: pageText, auto: false } })}>
            🔎 Sembol & tema analizi
          </button>
        </div>
      </div>

      {(panel === "explain" || panel === "summary") && (
        <AiOutput s={explain} title={`${item.title} — ${panel === "explain" ? `Sayfa ${page + 1} anlatımı` : "Özet"}`} kind={panel === "explain" ? "paste" : "summary"} lang={nativeCode(settings.nativeLang)} extraActions={<button className="btn ghost" onClick={() => setPanel("none")}>Kapat</button>} />
      )}
      {panel === "podcast" && (
        <div className="card output">
          <div className="row between wrap">
            <h3>🎙 {podcast?.title || "Podcast"}</h3>
            <div className="row">
              {podcast && <button className="btn" onClick={() => (podOwner && (n.playing || n.paused) ? narrator.toggle() : playPodcast(podcast))}>{podOwner && n.playing ? "⏸" : "▶"} Dinle</button>}
              <button className="btn ghost" onClick={() => setPanel("none")}>Kapat</button>
            </div>
          </div>
          {podBusy && <div className="status"><span className="spinner" /> İki sunuculu bölüm yazılıyor…</div>}
          {podErr && <div className="error">{podErr}</div>}
          {podcast && (
            <div className="dialogue">
              {podcast.turns.map((t, i) => (
                <div key={i} className={`bubble ${t.speaker === "B" ? "right" : ""} ${podOwner && n.index === i ? "now" : ""}`} onClick={() => podOwner && narrator.seek(i)}>
                  <small>Sunucu {t.speaker}</small>
                  <div>{t.text}</div>
                </div>
              ))}
            </div>
          )}
          <p className="muted small">İki farklı ses Ayarlar'dan seçilebilir. Tek ses varsa sunucular ton farkıyla ayrılır.</p>
        </div>
      )}

      <article className="card reader-text" style={{ fontSize }} lang={lang}>
        {groupByPara(pageSentences, page * PAGE).map((para) => (
          <p key={para.key}>
            {para.items.map(({ s, i }) => {
              const cur = mine && n.index === i;
              return (
                <span
                  key={i}
                  ref={cur ? curRef : undefined}
                  className={`sent ${cur ? "now" : ""}`}
                  onClick={() => tapMode === "seek" && playFrom(i)}
                >
                  {tapMode === "word" ? (
                    <Clickable text={s.text} lang={lang} onWord={(w, e) => setTarget({ word: w, context: s.text, lang, x: e.clientX, y: e.clientY })} />
                  ) : (
                    s.text
                  )}{" "}
                </span>
              );
            })}
          </p>
        ))}
      </article>

      <div className="row between pager">
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Önceki</button>
        <span className="muted">
          Sayfa
          <input
            type="number"
            min={1}
            max={pages}
            value={page + 1}
            onChange={(e) => setPage(Math.max(0, Math.min(pages - 1, Number(e.target.value) - 1)))}
            aria-label="Sayfa"
          />
          / {pages}
        </span>
        <button className="btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Sonraki →</button>
      </div>
      {target && <WordPopup target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function groupByPara(list: { text: string; para: number }[], offset: number) {
  const out: { key: string; items: { s: { text: string; para: number }; i: number }[] }[] = [];
  list.forEach((s, k) => {
    const last = out[out.length - 1];
    if (last && last.items[0].s.para === s.para) last.items.push({ s, i: offset + k });
    else out.push({ key: `${s.para}-${offset + k}`, items: [{ s, i: offset + k }] });
  });
  return out;
}

/** Basit dil tahmini: yazı sistemi + sık kelimeler */
function guessLang(text: string): string {
  const t = text.slice(0, 4000).toLowerCase();
  if (/[぀-ヿ]/.test(t)) return "ja-JP";
  if (/[가-힯]/.test(t)) return "ko-KR";
  if (/[一-鿿]/.test(t)) return "zh-CN";
  if (/[؀-ۿ]/.test(t)) return "ar-SA";
  if (/[Ѐ-ӿ]/.test(t)) return "ru-RU";
  const score = (words: string[]) => words.reduce((n, w) => n + (t.match(new RegExp(`\\b${w}\\b`, "g"))?.length || 0), 0);
  const cands: [string, number][] = [
    ["tr-TR", score(["ve", "bir", "bu", "için", "ile", "da", "de", "çok", "olarak", "gibi"]) + (/[ğışçöü]/.test(t) ? 20 : 0)],
    ["en-US", score(["the", "and", "of", "to", "is", "that", "with", "for"])],
    ["de-DE", score(["der", "die", "und", "das", "ist", "nicht", "mit", "sich"])],
    ["fr-FR", score(["le", "la", "les", "et", "est", "une", "pour", "dans"])],
    ["es-ES", score(["el", "los", "que", "y", "en", "una", "por", "con"])],
    ["it-IT", score(["il", "che", "di", "e", "non", "una", "per", "sono"])],
    ["pt-BR", score(["o", "que", "não", "uma", "para", "com", "os", "é"])],
  ];
  cands.sort((a, b) => b[1] - a[1]);
  return cands[0][1] > 3 ? cands[0][0] : "en-US";
}
