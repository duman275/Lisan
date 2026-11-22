import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { streamAI } from "../lib/api";
import { Markdown } from "../lib/markdown";
import { saveItem, uid, useSettings, type LibraryItem } from "../lib/store";
import { plainText, splitSentences } from "../lib/text";
import { narrator, nativeCode, useNarrator } from "../lib/tts";

// ---------- Gezinme ----------

export type Tab = "learn" | "library" | "catalog" | "summary" | "analysis" | "settings";
export interface Route {
  tab: Tab;
  readerId?: string;
  prefill?: { title?: string; author?: string; text?: string; auto?: boolean; mode?: string };
  learnSub?: string;
  course?: { course: string; unit?: number };
  autoplay?: boolean;
}
export const NavContext = createContext<{ route: Route; go: (r: Route) => void }>({ route: { tab: "learn" }, go: () => {} });
export const useNav = () => useContext(NavContext);

// ---------- Sunucu durumu ----------

export interface Health {
  ai: boolean;
  checked: boolean;
  agent: { claude: boolean; ollama: boolean; ollamaModel: string; ollamaModels: string[] };
}
export const NO_HEALTH: Health = { ai: false, checked: false, agent: { claude: false, ollama: false, ollamaModel: "", ollamaModels: [] } };
export const HealthContext = createContext<Health>(NO_HEALTH);
export const useHealth = () => useContext(HealthContext);

export function AiNotice() {
  const h = useHealth();
  if (!h.checked || h.ai) return null;
  return (
    <div className="notice">
      Yapay zekâ özellikleri kapalı: sunucuda <code>ANTHROPIC_API_KEY</code> tanımlı değil. Kitap okuma, seslendirme, kartlar ve PDF okuma yine de çalışır.
    </div>
  );
}

// ---------- Akış kancası ----------

export function useStream() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sources, setSources] = useState<{ url: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (body: Record<string, unknown>) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setText("");
    setStatus("");
    setSources([]);
    setError("");
    setLoading(true);
    try {
      const r = await streamAI(
        body,
        {
          onText: (_c, full) => {
            setText(full);
            setStatus("");
          },
          onStatus: setStatus,
          onSource: (s) => setSources((prev) => [...prev, s]),
        },
        c.signal,
      );
      return r;
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      return null;
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    ctrl.current?.abort();
    setLoading(false);
  }, []);

  useEffect(() => () => ctrl.current?.abort(), []);
  return { text, status, sources, loading, error, run, cancel, setText };
}

// ---------- Dinle düğmesi ----------

export function ListenButton({ text, lang, title, id }: { text: string; lang?: string; title?: string; id?: string }) {
  const n = useNarrator();
  const [settings] = useSettings();
  const owner = id || title || "listen";
  const mine = n.ownerId === owner;
  const playing = mine && n.playing;
  return (
    <button
      className="btn"
      disabled={!text.trim()}
      onClick={() => {
        if (mine && (n.playing || n.paused)) return narrator.toggle();
        const l = lang || nativeCode(settings.nativeLang);
        const segs = splitSentences(plainText(text), l).map((s) => ({ text: s.text, lang: l }));
        narrator.play(segs, { title: title || "Dinleniyor", ownerId: owner });
      }}
    >
      {playing ? "⏸ Duraklat" : mine && n.paused ? "▶ Devam" : "🎧 Dinle"}
    </button>
  );
}

// ---------- Yapay zekâ çıktı paneli ----------

export function AiOutput({
  s,
  title,
  kind,
  lang,
  extraActions,
}: {
  s: ReturnType<typeof useStream>;
  title: string;
  kind: LibraryItem["kind"];
  lang?: string;
  extraActions?: ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(false);
  }, [s.text === ""]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s.text && !s.loading && !s.error) return null;
  return (
    <div className="card output">
      <div className="row between wrap">
        <div className="row wrap">
          <ListenButton text={s.text} lang={lang} title={title} id={`out:${title}`} />
          <button
            className="btn"
            disabled={!s.text || s.loading || saved}
            onClick={async () => {
              await saveItem({
                id: uid(),
                title,
                kind,
                text: plainText(s.text),
                added: Date.now(),
                position: 0,
                lang,
                sources: s.sources,
              });
              setSaved(true);
            }}
          >
            {saved ? "✓ Kütüphanede" : "💾 Kütüphaneye kaydet"}
          </button>
          {extraActions}
        </div>
        {s.loading && (
          <button className="btn ghost" onClick={s.cancel}>
            Durdur
          </button>
        )}
      </div>
      {s.error && <div className="error">{s.error}</div>}
      {s.loading && (s.status || !s.text) && <div className="status"><span className="spinner" /> {s.status || "Düşünüyor…"}</div>}
      <Markdown text={s.text} />
      {s.sources.length > 0 && (
        <details className="sources" open={!s.loading}>
          <summary>Kaynaklar ({s.sources.length})</summary>
          <ol>
            {s.sources.map((x) => (
              <li key={x.url}>
                <a href={x.url} target="_blank" rel="noreferrer noopener">
                  {x.title || x.url}
                </a>{" "}
                <span className="muted">{hostOf(x.url)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={o.id === value} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
