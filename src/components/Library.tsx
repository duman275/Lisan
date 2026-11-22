import { useRef, useState } from "react";
import { getJSON } from "../lib/api";
import { deleteItem, saveItem, uid, useLibrary, type LibraryItem } from "../lib/store";
import { toBcp47 } from "../lib/tts";
import { useNav } from "./common";
import { Reader } from "./Reader";

const KIND_LABEL: Record<LibraryItem["kind"], string> = {
  gutenberg: "📗 Kitap",
  pdf: "📄 PDF",
  paste: "📝 Metin",
  story: "✨ Hikâye",
  summary: "🧾 Özet",
  analysis: "🔎 Analiz",
};

export async function openGutenberg(id: number, fallback?: { title?: string; author?: string }): Promise<string> {
  const b = await getJSON<{ title: string; author: string; lang: string; text: string }>(`/api/books/${id}/text`);
  const itemId = `pg-${id}`;
  await saveItem({
    id: itemId,
    title: fallback?.title || b.title,
    author: fallback?.author || b.author,
    lang: toBcp47(b.lang),
    kind: "gutenberg",
    text: b.text,
    added: Date.now(),
    position: 0,
  });
  return itemId;
}

export function Library() {
  const { route, go } = useNav();
  const items = useLibrary();
  if (route.readerId) return <Reader id={route.readerId} onBack={() => go({ tab: "library" })} />;
  return (
    <div className="stack">
      <AddBook onOpen={(id) => go({ tab: "library", readerId: id })} />
      <div className="card">
        <h3>Kütüphanem ({items.length})</h3>
        {!items.length && <p className="muted">Henüz bir şey yok. PDF yükle, metin yapıştır, Gutenberg'den kitap indir ya da “Efsaneler” sekmesinden bir klasik seç.</p>}
        <div className="lib-list">
          {items.map((it) => (
            <div key={it.id} className="lib-item">
              <button className="lib-open" onClick={() => go({ tab: "library", readerId: it.id })}>
                <span className="pill">{KIND_LABEL[it.kind]}</span>
                <strong>{it.title}</strong>
                {it.author && <span className="muted">{it.author}</span>}
                <span className="muted small">
                  ≈{Math.round(it.size / 1000)}K karakter · ≈{Math.max(1, Math.round(it.size / 6 / 160))} dk dinleme
                  {it.position > 0 && " · kaldığın yerden devam"}
                </span>
              </button>
              <button className="icon" aria-label="Sil" onClick={() => confirm(`“${it.title}” silinsin mi?`) && deleteItem(it.id)}>
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddBook({ onOpen }: { onOpen: (id: string) => void }) {
  const [mode, setMode] = useState<"pdf" | "search" | "paste">("pdf");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: number; title: string; authors: string[]; languages: string[]; downloads: number; hasText: boolean }[]>([]);
  const [paste, setPaste] = useState({ title: "", text: "" });

  async function onPdf(file: File) {
    setErr("");
    setStatus("PDF okunuyor…");
    try {
      const { extractPdf } = await import("../lib/pdf");
      const r = await extractPdf(file, (d, t) => setStatus(`Sayfa ${d}/${t} okunuyor…`));
      const text = r.pages.filter(Boolean).join("\n\n");
      if (text.replace(/\s/g, "").length < 50)
        throw new Error("Bu PDF'te seçilebilir metin bulunamadı (taranmış görüntü olabilir). Metin katmanı olan bir PDF deneyin.");
      const id = uid();
      await saveItem({ id, title: r.title, kind: "pdf", text, added: Date.now(), position: 0 });
      setStatus("");
      onOpen(id);
    } catch (e) {
      setStatus("");
      setErr((e as Error).message);
    }
  }

  async function search() {
    setErr("");
    setStatus("Aranıyor…");
    try {
      setHits(await getJSON(`/api/books/search?q=${encodeURIComponent(q)}`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setStatus("");
    }
  }

  return (
    <div className="card">
      <div className="row between wrap">
        <h3>Kitap ekle</h3>
        <div className="segmented">
          <button className={mode === "pdf" ? "on" : ""} onClick={() => setMode("pdf")}>📄 PDF yükle</button>
          <button className={mode === "search" ? "on" : ""} onClick={() => setMode("search")}>📚 Ücretsiz klasikler</button>
          <button className={mode === "paste" ? "on" : ""} onClick={() => setMode("paste")}>📝 Metin yapıştır</button>
        </div>
      </div>
      {mode === "pdf" && (
        <div
          className="dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void onPdf(f);
          }}
        >
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])} />
          <div className="big-icon">📄</div>
          <p><b>PDF'i buraya sürükle ya da tıkla</b></p>
          <p className="muted small">Dosya yalnızca tarayıcında işlenir. Sonra sesli dinleyebilir, sayfa sayfa “anlat” diyebilir, podcast'e dönüştürebilirsin.</p>
        </div>
      )}
      {mode === "search" && (
        <>
          <form className="row" onSubmit={(e) => (e.preventDefault(), search())}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kitap ya da yazar: Dostoevsky, Sherlock, Jane Austen…" />
            <button className="btn primary" disabled={!q.trim()}>Ara</button>
          </form>
          <p className="muted small">Project Gutenberg'deki 75.000+ telifsiz kitap; tam metin okunur ve dinlenir.</p>
          <div className="hits">
            {hits.map((h) => (
              <button
                key={h.id}
                className="hit"
                disabled={!h.hasText}
                onClick={async () => {
                  setStatus("Kitap indiriliyor…");
                  setErr("");
                  try {
                    onOpen(await openGutenberg(h.id));
                  } catch (e) {
                    setErr((e as Error).message);
                  } finally {
                    setStatus("");
                  }
                }}
              >
                <strong>{h.title}</strong>
                <span className="muted small">{h.authors.join(", ")} · {h.languages.join(", ").toUpperCase()} · {h.downloads.toLocaleString("tr-TR")} indirme</span>
              </button>
            ))}
          </div>
        </>
      )}
      {mode === "paste" && (
        <div className="stack">
          <input placeholder="Başlık" value={paste.title} onChange={(e) => setPaste({ ...paste, title: e.target.value })} />
          <textarea rows={8} placeholder="Okunacak/dinlenecek metni yapıştır…" value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
          <button
            className="btn primary"
            disabled={!paste.text.trim()}
            onClick={async () => {
              const id = uid();
              await saveItem({ id, title: paste.title || "Metin", kind: "paste", text: paste.text, added: Date.now(), position: 0 });
              setPaste({ title: "", text: "" });
              onOpen(id);
            }}
          >
            Kaydet ve aç
          </button>
        </div>
      )}
      {status && <div className="status"><span className="spinner" /> {status}</div>}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
