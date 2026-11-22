import { useCallback, useEffect, useRef, useState } from "react";
import { appState, parseLocal, runTool } from "../lib/actions";
import { canRecognize, continuousListener, listen, setListenHooks } from "../lib/speech";
import { useSettings } from "../lib/store";
import { narrator, nativeCode } from "../lib/tts";
import { useHealth } from "./common";
import { STATIC } from "../lib/api";
import { llmAgentTurn } from "../lib/browserLLM";

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
type AgentMsg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; calls: ToolCall[]; raw?: unknown; provider?: string }
  | { role: "tool"; results: { id: string; name: string; output: string; isError?: boolean }[] };

interface Bubble {
  who: "me" | "bot" | "act";
  text: string;
}

const TOOL_LABEL: Record<string, string> = {
  get_app_state: "Durum kontrol edildi",
  navigate: "Sayfa açıldı",
  player_control: "Oynatıcı",
  set_learning: "Dil/seviye ayarlandı",
  start_course: "Kurs açıldı",
  add_flashcards: "Kartlar eklendi",
  search_books: "Kitap arandı",
  open_book: "Kitap açıldı",
  summarize_book: "Özet başlatıldı",
  analyze_book: "Analiz başlatıldı",
  speak: "Seslendirildi",
};

const WAKE = /^(hey |hi |ey |hay )?(lisan|lissan|lisa)\b[\s,.!:]*(.*)$/i;

/** Sağ altta duran yardımcı ajan + sesli komut sistemi. */
export function Assistant() {
  const [settings] = useSettings();
  const health = useHealth();
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState("");
  const history = useRef<AgentMsg[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const nl = nativeCode(settings.nativeLang);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [bubbles, busy]);

  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((x) => (x === t ? "" : x)), 2500);
  };

  const say = useCallback(
    (text: string) => {
      if (settings.agentSpeak && text) narrator.say(text, nl, 1.05);
    },
    [settings.agentSpeak, nl],
  );

  const ask = useCallback(
    async (text: string) => {
      setOpen(true);
      setBubbles((b) => [...b, { who: "me", text }]);
      if (!health.agent.claude && !health.agent.ollama && !health.agent.browser) {
        const msg = STATIC
          ? "Asistan için Ayarlar → “Telefonda yapay zekâ” bölümüne ücretsiz bir Gemini anahtarı ekle. Basit sesli komutlar (duraklat, devam, kartları aç…) şimdiden çalışır."
          : "Asistan için sunucuda Claude API anahtarı ya da bilgisayarında ücretsiz Ollama gerekli. Basit sesli komutlar (duraklat, devam, kartları aç…) yine de çalışır.";
        setBubbles((b) => [...b, { who: "bot", text: msg }]);
        return;
      }
      const h = history.current;
      h.push({ role: "user", text });
      setBusy(true);
      try {
        for (let step = 0; step < 8; step++) {
          let turn: { text: string; calls?: ToolCall[]; raw?: unknown; provider?: string };
          if (STATIC) {
            // Telefonda: tarayıcı doğrudan yapay zekâ servisine bağlanır
            turn = await llmAgentTurn(h, await appState());
          } else {
            const res = await fetch("/api/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ history: h, state: await appState(), provider: settings.agentProvider }),
            });
            turn = { text: "", ...(await res.json()) };
            if (!res.ok) throw new Error((turn as { error?: string }).error || `Sunucu hatası (${res.status})`);
          }
          h.push({ role: "assistant", text: turn.text || "", calls: turn.calls || [], raw: turn.raw, provider: turn.provider });
          if (turn.text) setBubbles((b) => [...b, { who: "bot", text: turn.text }]);
          if (!turn.calls?.length) {
            say(turn.text);
            break;
          }
          const results = [];
          for (const c of turn.calls as ToolCall[]) {
            try {
              const output = await runTool(c.name, c.input || {});
              results.push({ id: c.id, name: c.name, output });
              if (c.name !== "get_app_state" && c.name !== "search_books") setBubbles((b) => [...b, { who: "act", text: `✓ ${TOOL_LABEL[c.name] || c.name}` }]);
            } catch (e) {
              results.push({ id: c.id, name: c.name, output: `Error: ${(e as Error).message}`, isError: true });
            }
          }
          h.push({ role: "tool", results });
        }
      } catch (e) {
        setBubbles((b) => [...b, { who: "bot", text: `⚠️ ${(e as Error).message}` }]);
        // Yarım kalan tur geçmişi bozmasın: son kullanıcı mesajından sonrasını at
        const lastUser = h.map((m) => m.role).lastIndexOf("user");
        h.splice(lastUser);
      } finally {
        setBusy(false);
        // Geçmişi sınırlı tut: baştan, bir kullanıcı mesajına kadar kırp
        while (h.length > 40) {
          h.shift();
          while (h.length && h[0].role !== "user") h.shift();
        }
      }
    },
    [health.agent.claude, health.agent.ollama, health.agent.browser, settings.agentProvider, say],
  );

  const handleCommand = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      const local = parseLocal(t);
      if (local) {
        local.run();
        flash(local.label);
        if (open) setBubbles((b) => [...b, { who: "me", text: t }, { who: "act", text: local.label }]);
        return;
      }
      void ask(t);
    },
    [ask, open],
  );

  async function pushToTalk() {
    if (listening) return;
    setListening(true);
    narrator.pause();
    try {
      const heard = await listen(nl).promise;
      if (heard) handleCommand(heard);
      else flash("Ses algılanmadı");
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setListening(false);
    }
  }

  // "Lisan, ..." uyandırma kelimesi ile sürekli dinleme
  const wakeRef = useRef<ReturnType<typeof continuousListener> | null>(null);
  const handleRef = useRef(handleCommand);
  handleRef.current = handleCommand;
  useEffect(() => {
    if (!settings.wakeWord || !canRecognize()) return;
    let awaiting = false;
    const w = continuousListener(nl, (heard) => {
      const m = WAKE.exec(heard.trim());
      if (m) {
        const rest = m[3].trim();
        if (rest) handleRef.current(rest);
        else {
          awaiting = true;
          flash("🎙 Dinliyorum…");
          narrator.pause();
        }
      } else if (awaiting) {
        awaiting = false;
        handleRef.current(heard);
      }
    });
    wakeRef.current = w;
    setListenHooks(
      () => w.stop(),
      () => w.start(),
    );
    w.start();
    return () => {
      w.stop();
      setListenHooks(
        () => {},
        () => {},
      );
    };
  }, [settings.wakeWord, nl]);

  // Klavye kısayolu: Ctrl/Cmd + Shift + Boşluk → sesli komut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        void pushToTalk();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      {toast && <div className="toast" role="status">{toast}</div>}
      <div className="fab-group">
        {settings.voiceCommands && canRecognize() && (
          <button className={`fab mic ${listening ? "rec" : ""}`} onClick={pushToTalk} aria-label="Sesli komut" title="Sesli komut (Ctrl+Shift+Boşluk)">
            {listening ? "⏺" : "🎙"}
          </button>
        )}
        <button className="fab" onClick={() => setOpen(!open)} aria-label="Asistan" title="Lisan Asistan">
          {open ? "✕" : "🤖"}
        </button>
      </div>
      {open && (
        <div className="assistant card" role="dialog" aria-label="Lisan Asistan">
          <div className="row between">
            <strong>🤖 Lisan Asistan</strong>
            <span className="muted small">
              {health.agent.browser
                ? "Telefonda yapay zekâ"
                : (settings.agentProvider === "ollama" && health.agent.ollama) || (!health.agent.claude && health.agent.ollama)
                ? `Ollama · ${health.agent.ollamaModel} (ücretsiz)`
                : health.agent.claude
                  ? "Claude"
                  : "yalnızca yerel komutlar"}
              {settings.wakeWord && " · “Lisan” de"}
            </span>
          </div>
          <div className="assistant-log">
            {!bubbles.length && (
              <div className="muted small">
                <p>Yazarak ya da 🎙 ile konuşarak iste. Örnekler:</p>
                <div className="chips">
                  {[
                    "Suç ve Ceza'yı aç ve sesli oku",
                    "Native İngilizce kursunun 3. dersini başlat",
                    "Bugün ne çalışmalıyım?",
                    "Bana seyahat için 10 İngilizce kalıp ekle",
                    "1984'ün sembollerini analiz et",
                    "Okumayı 20 dakika sonra durdur",
                  ].map((x) => (
                    <button key={x} className="chip" onClick={() => handleCommand(x)}>
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {bubbles.map((b, i) => (
              <div key={i} className={`ab ${b.who}`}>
                {b.text}
              </div>
            ))}
            {busy && (
              <div className="status">
                <span className="spinner" /> Çalışıyor…
              </div>
            )}
            <div ref={end} />
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const t = input;
              setInput("");
              handleCommand(t);
            }}
          >
            {canRecognize() && (
              <button type="button" className={`icon ${listening ? "rec" : ""}`} onClick={pushToTalk} aria-label="Konuş">
                🎙
              </button>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ne yapmamı istersin?" disabled={busy} />
            <button className="btn primary" disabled={busy || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
