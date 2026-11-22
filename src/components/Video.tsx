import { del, get, set } from "idb-keyval";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings, uid } from "../lib/store";
import { narrator, findVoice, synthNeural, toBcp47 } from "../lib/tts";
import { NEURAL_PREFIX } from "../lib/voices";
import {
  cueAt,
  deleteVideoFile,
  fmtSize,
  fmtTime,
  loadVideoFile,
  MAX_VIDEO,
  parseSubs,
  saveVideoFile,
  toSrt,
  toVtt,
  transcribe,
  translateCues,
  uploadToGemini,
  type Cue,
  type VideoMeta,
} from "../lib/video";
import { LANGUAGES, langByCode } from "../data/languages";
import { useHealth } from "./common";
import { VoicePicker } from "./VoicePicker";

const META = "video:meta";

function useVideos(): [VideoMeta[], (fn: (v: VideoMeta[]) => VideoMeta[]) => Promise<void>] {
  const [list, setList] = useState<VideoMeta[]>([]);
  useEffect(() => {
    void get<VideoMeta[]>(META).then((v) => setList(v || []));
  }, []);
  const update = async (fn: (v: VideoMeta[]) => VideoMeta[]) => {
    const next = fn((await get<VideoMeta[]>(META)) || []);
    await set(META, next);
    setList(next);
  };
  return [list, update];
}

const label = (key: string, meta?: VideoMeta) =>
  key === "orig" ? `Orijinal${meta?.spokenLang ? ` (${langByCode(toBcp47(meta.spokenLang)).label})` : ""}` : `${langByCode(key).flag} ${langByCode(key).label}`;

export function VideoTab() {
  const [videos, update] = useVideos();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = videos.find((v) => v.id === openId);
  if (open) return <Player meta={open} update={update} onBack={() => setOpenId(null)} />;
  return <VideoList videos={videos} update={update} onOpen={setOpenId} />;
}

function VideoList({ videos, update, onOpen }: { videos: VideoMeta[]; update: ReturnType<typeof useVideos>[1]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  async function add(file: File) {
    setErr("");
    if (file.size > MAX_VIDEO) return setErr(`Video ${fmtSize(file.size)} — en fazla 2 GB yüklenebilir.`);
    const id = uid();
    try {
      setStatus("Video telefona kaydediliyor… %0");
      await saveVideoFile(id, file, (p) => setStatus(`Video telefona kaydediliyor… %${p}`));
      const duration = await new Promise<number>((res) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : 0);
        v.onerror = () => res(0);
        v.src = URL.createObjectURL(file);
      });
      const meta: VideoMeta = { id, name: file.name, size: file.size, type: file.type || "video/mp4", duration, added: Date.now(), subs: {} };
      await update((l) => [meta, ...l]);
      setStatus("");
      onOpen(id);
    } catch (e) {
      await deleteVideoFile(id);
      setStatus("");
      setErr((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>🎬 Video: altyazı, çeviri ve dublaj</h2>
        <p className="small">
          2 GB'a kadar videonu yükle: konuşmalar yapay zekâyla (Gemini) <b>zaman damgalı altyazıya</b> çevrilir, istediğin dile <b>çevrilir</b> ve kadın/erkek seslerle{" "}
          <b>dublaj</b> yapılır. Hazır .srt/.vtt altyazı da yükleyebilirsin. Video yalnızca telefonunda saklanır.
        </p>
        <div
          className="dropzone"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) void add(f);
          }}
        >
          <input ref={ref} type="file" accept="video/*,audio/*" hidden onChange={(e) => e.target.files?.[0] && add(e.target.files[0])} />
          <div className="big-icon">🎬</div>
          <p>
            <b>Video seç (en fazla 2 GB)</b>
          </p>
          <p className="muted small">MP4, WebM, MOV… Ses dosyası (MP3, M4A) da olur.</p>
        </div>
        {status && (
          <div className="status">
            <span className="spinner" /> {status}
          </div>
        )}
        {err && <div className="error">{err}</div>}
      </div>
      <div className="card">
        <h3>Videolarım ({videos.length})</h3>
        {!videos.length && <p className="muted">Henüz video yok.</p>}
        <div className="lib-list">
          {videos.map((v) => (
            <div key={v.id} className="lib-item">
              <button className="lib-open" onClick={() => onOpen(v.id)}>
                <span className="pill">🎬</span>
                <strong>{v.name}</strong>
                <span className="muted small">
                  {fmtSize(v.size)} · {fmtTime(v.duration)} · altyazı: {Object.keys(v.subs).length ? Object.keys(v.subs).map((k) => label(k, v)).join(", ") : "yok"}
                </span>
              </button>
              <button
                className="icon"
                aria-label="Sil"
                onClick={async () => {
                  if (!confirm(`“${v.name}” silinsin mi?`)) return;
                  await deleteVideoFile(v.id);
                  await del(`video:pos:${v.id}`);
                  await update((l) => l.filter((x) => x.id !== v.id));
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function Player({ meta, update, onBack }: { meta: VideoMeta; update: ReturnType<typeof useVideos>[1]; onBack: () => void }) {
  const [settings] = useSettings();
  const health = useHealth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState("");
  const [missing, setMissing] = useState(false);
  const [time, setTime] = useState(0);
  const tracks = Object.keys(meta.subs);
  const [sub1, setSub1] = useState<string>(tracks.find((k) => k !== "orig") || tracks[0] || "");
  const [sub2, setSub2] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [target, setTarget] = useState(settings.targetLang === "tr-TR" ? "en-US" : "tr-TR");
  const [dubOn, setDubOn] = useState(false);
  const [dubLang, setDubLang] = useState<string>(tracks.find((k) => k !== "orig") || "");
  const [origVol, setOrigVol] = useState(0.15);
  const abort = useRef<AbortController | null>(null);
  const subFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let url = "";
    void loadVideoFile(meta.id).then((f) => {
      if (!f) return setMissing(true);
      url = URL.createObjectURL(f);
      setSrc(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
      abort.current?.abort();
    };
  }, [meta.id]);

  // Kaldığı yeri hatırla
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    void get<number>(`video:pos:${meta.id}`).then((p) => p && (v.currentTime = p));
    const save = () => void set(`video:pos:${meta.id}`, v.currentTime);
    const t = window.setInterval(save, 5000);
    return () => {
      window.clearInterval(t);
      save();
    };
  }, [src, meta.id]);

  const c1 = meta.subs[sub1];
  const c2 = meta.subs[sub2];
  const i1 = cueAt(c1, time);
  const i2 = cueAt(c2, time);

  async function saveSubs(key: string, cues: Cue[], extra: Partial<VideoMeta> = {}) {
    await update((l) => l.map((x) => (x.id === meta.id ? { ...x, ...extra, subs: { ...x.subs, [key]: cues } } : x)));
  }

  async function runTranscribe() {
    setErr("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const f = await loadVideoFile(meta.id);
      if (!f) throw new Error("Video dosyası bulunamadı.");
      let g = meta.gemini && meta.gemini.expires > Date.now() ? meta.gemini : undefined;
      if (!g) {
        setBusy("Gemini'ye yükleniyor… %0");
        const up = await uploadToGemini(f, (p) => setBusy(`Gemini'ye yükleniyor… %${p}${p === 100 ? " — işleniyor" : ""}`), ctrl.signal);
        g = { ...up, expires: Date.now() + 47 * 3600_000 };
        await update((l) => l.map((x) => (x.id === meta.id ? { ...x, gemini: g } : x)));
      }
      const r = await transcribe(g, meta.duration, (msg) => setBusy(msg), ctrl.signal);
      if (!r.cues.length) throw new Error("Videoda konuşma bulunamadı.");
      await saveSubs("orig", r.cues, { spokenLang: r.lang });
      setSub1("orig");
      setBusy("");
    } catch (e) {
      setBusy("");
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    }
  }

  async function runTranslate() {
    setErr("");
    const base = meta.subs.orig || meta.subs[sub1];
    if (!base?.length) return setErr("Önce altyazı çıkar ya da yükle.");
    try {
      setBusy(`Çevriliyor… 0/${base.length}`);
      const out = await translateCues(base, langByCode(target).name, (d) => setBusy(`Çevriliyor… ${d}/${base.length}`));
      await saveSubs(target, out);
      setSub1(target);
      if (meta.subs.orig) setSub2("orig");
      setDubLang(target);
      setBusy("");
    } catch (e) {
      setBusy("");
      setErr((e as Error).message);
    }
  }

  // ---------- Dublaj ----------
  const dub = useDubber(videoRef, dubOn ? meta.subs[dubLang] : undefined, dubLang, origVol);

  const llmReady = health.llm || Boolean(settings.llmKey);
  const geminiReady = Boolean(settings.llmKey) && settings.llmBaseUrl.includes("generativelanguage");

  return (
    <div className="stack">
      <button className="btn ghost self-start" onClick={onBack}>
        ← Videolarım
      </button>
      <div className="card video-card">
        <h3 className="video-title">{meta.name}</h3>
        {missing ? (
          <p className="error">Video dosyası bu cihazda bulunamadı (tarayıcı verileri silinmiş olabilir). Altyazılar duruyor; videoyu yeniden yükleyebilirsin.</p>
        ) : (
          <div className="video-wrap">
            <video ref={videoRef} src={src} controls playsInline onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} />
            <div className="subs-overlay" aria-live="polite">
              {i2 >= 0 && <div className="sub sub2">{c2![i2].t}</div>}
              {i1 >= 0 && <div className="sub">{c1![i1].t}</div>}
            </div>
          </div>
        )}
        <div className="toolbar">
          <label className="small">
            Altyazı
            <select value={sub1} onChange={(e) => setSub1(e.target.value)}>
              <option value="">Kapalı</option>
              {tracks.map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
            </select>
          </label>
          <label className="small">
            İkinci altyazı (dil öğrenmek için)
            <select value={sub2} onChange={(e) => setSub2(e.target.value)}>
              <option value="">Yok</option>
              {tracks.map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {busy && (
        <div className="card status">
          <span className="spinner" /> {busy}
          <button className="btn ghost small" onClick={() => abort.current?.abort()}>
            Durdur
          </button>
        </div>
      )}
      {err && <div className="error">{err}</div>}

      <div className="card">
        <h3>1 · Altyazı</h3>
        <div className="row wrap">
          <button className="btn primary" disabled={Boolean(busy) || !geminiReady} onClick={runTranscribe}>
            🎙 Konuşmalardan altyazı çıkar (Gemini)
          </button>
          <button className="btn" onClick={() => subFile.current?.click()}>
            📄 .srt / .vtt yükle
          </button>
          <input
            ref={subFile}
            type="file"
            accept=".srt,.vtt,text/vtt"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const cues = parseSubs(await f.text());
              if (!cues.length) return setErr("Altyazı dosyası okunamadı.");
              await saveSubs("orig", cues);
              setSub1("orig");
            }}
          />
        </div>
        {!geminiReady && (
          <p className="muted small">
            Altyazı çıkarmak için <b>Ayarlar → Telefonda yapay zekâ</b>'ya Google Gemini anahtarını ekle (ücretsiz). Video Gemini'ye yüklenir ve 48 saat sonra oradan
            silinir. Uzun videolar 15 dakikalık bölümlerle işlenir.
          </p>
        )}
      </div>

      <div className="card">
        <h3>2 · Çeviri</h3>
        <div className="row wrap">
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Hedef dil">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={Boolean(busy) || !llmReady || !tracks.length} onClick={runTranslate}>
            🌐 Altyazıyı çevir
          </button>
        </div>
        {tracks.length > 0 && (
          <div className="row wrap">
            {tracks.map((k) => (
              <span key={k} className="row">
                <span className="pill">{label(k, meta)}</span>
                <button className="btn ghost small" onClick={() => download(`${meta.name.replace(/\.[^.]+$/, "")}.${k}.srt`, toSrt(meta.subs[k]), "application/x-subrip")}>
                  ⬇ SRT
                </button>
                <button className="btn ghost small" onClick={() => download(`${meta.name.replace(/\.[^.]+$/, "")}.${k}.vtt`, toVtt(meta.subs[k]), "text/vtt")}>
                  ⬇ VTT
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>3 · Dublaj</h3>
        <p className="muted small">Seçtiğin dildeki altyazılar video oynarken seslendirilir; orijinal ses kısılır. Nöral seslerle (♂/♀) en doğal sonucu verir.</p>
        <div className="row wrap">
          <select value={dubLang} onChange={(e) => setDubLang(e.target.value)} aria-label="Dublaj dili">
            <option value="">Dublaj dili seç…</option>
            {tracks
              .filter((k) => k !== "orig" || meta.spokenLang)
              .map((k) => (
                <option key={k} value={k}>
                  {label(k, meta)}
                </option>
              ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={dubOn} disabled={!dubLang} onChange={(e) => setDubOn(e.target.checked)} /> Dublajı aç
          </label>
        </div>
        {dubLang && <VoicePicker lang={dubLang === "orig" ? toBcp47(meta.spokenLang) : dubLang} />}
        <label className="small">
          Orijinal ses: %{Math.round(origVol * 100)}
          <input type="range" min={0} max={1} step={0.05} value={origVol} onChange={(e) => setOrigVol(Number(e.target.value))} />
        </label>
        {dub && <p className="muted small">{dub}</p>}
      </div>

      {c1 && c1.length > 0 && (
        <div className="card">
          <h3>Metin ({label(sub1, meta)})</h3>
          <div className="transcript">
            {c1.map((c, k) => (
              <button
                key={k}
                className={`tline ${k === i1 ? "now" : ""}`}
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = c.s + 0.01;
                }}
              >
                <span className="muted small">{fmtTime(c.s)}</span> {c.t}
                {c2 && cueAt(c2, c.s + 0.05) >= 0 && <span className="muted small"> — {c2[cueAt(c2, c.s + 0.05)].t}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Video oynarken altyazıları zamanında seslendirir. */
function useDubber(videoRef: React.RefObject<HTMLVideoElement | null>, cues: Cue[] | undefined, langKey: string, origVol: number): string {
  const [info, setInfo] = useState("");
  const audio = useMemo(() => new Audio(), []);
  const lang = langKey === "orig" ? "" : langKey;
  const clips = useRef(new Map<number, Promise<string>>());
  const last = useRef(-1);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = cues ? origVol : 1;
  }, [cues, origVol, videoRef]);

  useEffect(() => {
    const v = videoRef.current;
    clips.current.forEach((p) => p.then((u) => URL.revokeObjectURL(u)).catch(() => {}));
    clips.current.clear();
    last.current = -1;
    if (!v || !cues?.length) return;
    let raf = 0;
    const voiceOf = (text: string) => narrator.voiceFor({ text, lang });
    const neuralClip = (k: number) => {
      const vid = voiceOf(cues[k].t);
      if (!vid?.startsWith(NEURAL_PREFIX)) return null;
      let c = clips.current.get(k);
      if (!c) {
        c = synthNeural(cues[k].t, vid.slice(NEURAL_PREFIX.length));
        c.catch(() => clips.current.delete(k));
        clips.current.set(k, c);
      }
      return c;
    };
    const speak = (k: number) => {
      const c = cues[k];
      const dur = Math.max(0.6, c.e - c.s);
      // Sonraki 3 cümleyi önceden hazırla
      for (let j = k + 1; j <= Math.min(k + 3, cues.length - 1); j++) neuralClip(j);
      const clip = neuralClip(k);
      if (clip) {
        clip
          .then((url) => {
            if (last.current !== k || v.paused) return;
            audio.src = url;
            audio.onloadedmetadata = () => {
              audio.playbackRate = Math.min(1.7, Math.max(1, audio.duration / dur));
            };
            void audio.play().catch(() => {});
            setInfo("");
          })
          .catch(() => setInfo("Nöral ses yüklenemedi; telefonun sesi kullanılıyor."));
        return;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(c.t);
      const dv = findVoice(voiceOf(c.t), lang);
      if (dv) u.voice = dv;
      u.lang = dv?.lang || lang;
      u.rate = Math.min(1.7, Math.max(1, c.t.length / 15 / dur));
      speechSynthesis.speak(u);
    };
    const tick = () => {
      const k = cueAt(cues, v.currentTime);
      if (k !== last.current) {
        last.current = k;
        if (k >= 0 && !v.paused) speak(k);
      }
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      audio.pause();
      speechSynthesis.cancel();
      last.current = -1;
    };
    v.addEventListener("pause", stop);
    v.addEventListener("seeking", stop);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("pause", stop);
      v.removeEventListener("seeking", stop);
      stop();
    };
  }, [cues, lang, audio, videoRef]);

  return info;
}
