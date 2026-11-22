import { useEffect, useRef, useState } from "react";
import { STATIC } from "../lib/api";
import { LLM_PRESETS, listModels, testLlm } from "../lib/browserLLM";
import { InstallButton } from "./Install";
import { VoicePicker } from "./VoicePicker";
import { NEURAL_PREFIX, neuralFor } from "../lib/voices";
import { langByCode } from "../data/languages";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, useCards, useProgress, useSettings } from "../lib/store";
import { narrator, nativeCode, useVoices } from "../lib/tts";
import { NATIVE_LANGUAGES } from "../data/languages";
import { useHealth } from "./common";

export function SettingsView() {
  const [settings, setSettings] = useSettings();
  const [cards, setCards] = useCards();
  const [progress, setProgress] = useProgress();
  const health = useHealth();
  const nativeVoices = useVoices(nativeCode(settings.nativeLang));
  const allVoices = useVoices();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify({ settings, cards, progress }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lisan-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>📲 Uygulamayı telefona yükle</h3>
        <p className="muted small">Lisan'ı ana ekranına uygulama olarak ekle: tam ekran açılır, çevrimdışı da çalışır (dersler, kartlar, indirilen kitaplar).</p>
        <InstallButton />
      </div>
      {STATIC && <PhoneAI />}
      <div className="card">
        <h3>Genel</h3>
        <div className="form">
          <label>
            Ana dilin (açıklamalar, özetler ve analizler bu dilde)
            <select value={settings.nativeLang} onChange={(e) => setSettings((s) => ({ ...s, nativeLang: e.target.value }))}>
              {NATIVE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>{l.name}</option>
              ))}
            </select>
          </label>
          <label>
            Görünüm
            <select value={settings.theme || "westeros"} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as "westeros" | "classic" }))}>
              <option value="westeros">🐺🐉 Buz ve Ateş (koyu, altın)</option>
              <option value="classic">Klasik (açık)</option>
            </select>
          </label>
          <label>
            Günlük hedef (dakika)
            <input type="number" min={10} max={240} value={settings.dailyGoal} onChange={(e) => setSettings((s) => ({ ...s, dailyGoal: Number(e.target.value) || 45 }))} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Sesler</h3>
        <p className="small">
          <b>🧠 Nöral sesler</b> telefonda çalışan, ücretsiz ve çok doğal seslerdir: ilk seçtiğinde bir kez indirilir (≈20–60 MB), sonra internetsiz çalışır ve
          <b> ekran kapalıyken de kitabı baştan sona okumaya devam eder</b>. Türkçede 3 erkek nöral ses (Fahrettin, Fettah, DFKI) var; Türkçe kadın sesi için
          telefonun Google sesi kullanılır.
        </p>
        <h4>{settings.nativeLang} (açıklamalar, özetler, Türkçe kitaplar)</h4>
        <VoicePicker lang={nativeCode(settings.nativeLang)} />
        <h4>{langByCode(settings.targetLang).label} (öğrendiğin dil)</h4>
        <VoicePicker lang={settings.targetLang} />
        <hr />

        <p className="muted small">
          Sesler tarayıcı ve işletim sisteminden gelir ({allVoices.length} ses bulundu). En doğal sesler: Chrome'da “Google …”, Edge'de “… Online (Natural)”, macOS/iOS'ta
          “Gelişmiş/Premium” sesler (Ayarlar → Erişilebilirlik → Sesli İçerik'ten indirilebilir).
        </p>
        <div className="form">
          <label>
            Okuma hızı: {settings.rate}×
            <input type="range" min={0.5} max={2} step={0.05} value={settings.rate} onChange={(e) => setSettings((s) => ({ ...s, rate: Number(e.target.value) }))} />
          </label>
          <label>
            Ses tonu: {settings.pitch}
            <input type="range" min={0.5} max={1.5} step={0.05} value={settings.pitch} onChange={(e) => setSettings((s) => ({ ...s, pitch: Number(e.target.value) }))} />
          </label>
          <label>
            Podcast sunucusu A
            <select value={settings.podcastVoiceA || ""} onChange={(e) => setSettings((s) => ({ ...s, podcastVoiceA: e.target.value || undefined }))}>
              <option value="">Otomatik (A: kadın, B: erkek)</option>
              {neuralFor(nativeCode(settings.nativeLang)).map((v) => (
                <option key={v.id} value={NEURAL_PREFIX + v.id}>
                  🧠 {v.gender === "f" ? "♀" : "♂"} {v.name} (nöral)
                </option>
              ))}
              {nativeVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </label>
          <label>
            Podcast sunucusu B
            <select value={settings.podcastVoiceB || ""} onChange={(e) => setSettings((s) => ({ ...s, podcastVoiceB: e.target.value || undefined }))}>
              <option value="">Otomatik (A: kadın, B: erkek)</option>
              {neuralFor(nativeCode(settings.nativeLang)).map((v) => (
                <option key={v.id} value={NEURAL_PREFIX + v.id}>
                  🧠 {v.gender === "f" ? "♀" : "♂"} {v.name} (nöral)
                </option>
              ))}
              {nativeVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => narrator.say("Merhaba! Ben A sunucusuyum. Bugün harika bir kitap konuşacağız.", "tr-TR", settings.rate, settings.podcastVoiceA)}>A sesini dene</button>
          <button className="btn" onClick={() => narrator.say("Ben de B sunucusuyum. Hadi başlayalım!", "tr-TR", settings.rate, settings.podcastVoiceB)}>B sesini dene</button>
        </div>
        {!narrator.supported() && <div className="error">Bu tarayıcı sesli okumayı desteklemiyor.</div>}
      </div>

      <div className="card">
        <h3>Yapay zekâ kaynağı, asistan ve sesli komutlar</h3>
        <p className="muted small">
          🎙 düğmesine bas (ya da Ctrl+Shift+Boşluk) ve konuş: “duraklat”, “devam”, “sonraki”, “hızlandır”, “20 dakika sonra kapat”, “kartları aç”, “kütüphaneye git” gibi
          kısa komutlar yapay zekâ olmadan anında çalışır. Daha karmaşık istekler (“Suç ve Ceza'yı aç ve sesli oku”, “bana 10 iş İngilizcesi kalıbı ekle”) asistana gider.
        </p>
        <div className="form">
          <label className="check">
            <input type="checkbox" checked={settings.voiceCommands} onChange={(e) => setSettings((s) => ({ ...s, voiceCommands: e.target.checked }))} /> Sesli komut düğmesini göster
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.wakeWord} onChange={(e) => setSettings((s) => ({ ...s, wakeWord: e.target.checked }))} /> Eller serbest: “Lisan, …” diye seslenince dinle (mikrofon açık kalır)
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.agentSpeak} onChange={(e) => setSettings((s) => ({ ...s, agentSpeak: e.target.checked }))} /> Asistan yanıtlarını sesli oku
          </label>
          <label>
            Yapay zekâ kaynağı (dersler, öğretmen, özet, analiz, asistan)
            <select value={settings.agentProvider} onChange={(e) => setSettings((s) => ({ ...s, agentProvider: e.target.value as typeof s.agentProvider }))}>
              <option value="auto">Otomatik (Claude → Ollama → ücretsiz kaynaklar)</option>
              <option value="free">Yalnızca ücretsiz kaynaklar (Tatoeba, Wikipedia — model yok)</option>
              <option value="ollama">Ollama — bilgisayarında yerel, tamamen ücretsiz</option>
              <option value="claude">Claude — en akıllı (API kullanımı ücretli)</option>
            </select>
          </label>
        </div>
        <p className="small">
          Durum: Claude {health.agent.claude ? "✅" : "❌"} · Ollama {health.agent.ollama ? `✅ (${health.agent.ollamaModel})` : "❌ çalışmıyor"}
        </p>
        {!health.agent.ollama && (
          <details className="small">
            <summary>Ücretsiz asistanı kur (Ollama)</summary>
            <ol>
              <li>ollama.com adresinden Ollama'yı indirip kur.</li>
              <li>
                Terminalde: <code>ollama pull qwen3:8b</code> (≈5 GB; zayıf bilgisayarda <code>qwen3:4b</code>, sunucuda <code>OLLAMA_MODEL=qwen3:4b</code>)
              </li>
              <li>Lisan sunucusunu aynı bilgisayarda çalıştır; asistan Ollama'yı kendiliğinden bulur.</li>
            </ol>
          </details>
        )}
      </div>

      <div className="card">
        <h3>Veriler</h3>
        <p className="muted small">İlerlemen, kartların ve kütüphanen yalnızca bu cihazdaki tarayıcıda saklanır. Cihaz değiştirirken yedek al.</p>
        <div className="row wrap">
          <button className="btn" onClick={exportData}>⬇ Yedeği indir</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Yedeği yükle</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const d = JSON.parse(await f.text());
                if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings });
                if (Array.isArray(d.cards)) setCards(d.cards);
                if (d.progress) setProgress({ ...DEFAULT_PROGRESS, ...d.progress });
                alert("Yedek yüklendi.");
              } catch {
                alert("Geçersiz yedek dosyası.");
              }
            }}
          />
          <button className="btn danger" onClick={() => confirm("Tüm kartlar ve ilerleme silinsin mi?") && (setCards([]), setProgress(DEFAULT_PROGRESS))}>
            Sıfırla
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Sunucu</h3>
        <ul className="small">
          <li>Ücretsiz veri motoru (Tatoeba + Wikipedia): {health.free ? "✅ hazır" : "❌ veri yok — node scripts/build-data.mjs"}</li>
          <li>Ollama (yerel, ücretsiz): {health.agent.ollama ? `✅ ${health.agent.ollamaModel}` : "❌ çalışmıyor"}</li>
          <li>Claude API: {health.agent.claude ? "✅ anahtar var" : "— anahtar yok (isteğe bağlı)"}</li>
        </ul>
      </div>
    </div>
  );
}

/** Telefonda (sunucusuz) yapay zekâ: ücretsiz bir servis anahtarı ile öğretmen, podcast, hikâye ve asistan çalışır. */
function PhoneAI() {
  const [settings, setSettings] = useSettings();
  const [status, setStatus] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const preset = LLM_PRESETS.find((p) => p.id === settings.llmProvider) || LLM_PRESETS[0];

  useEffect(() => {
    window.dispatchEvent(new Event("lisan:health"));
  }, [settings.llmKey, settings.llmModel, settings.llmBaseUrl, settings.agentProvider]);

  async function test() {
    setBusy(true);
    setStatus("Deneniyor…");
    try {
      const out = await testLlm();
      setStatus(`✅ Çalışıyor! Model yanıtı: “${out.slice(0, 60)}”`);
    } catch (e) {
      setStatus(`❌ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>🤖 Telefonda yapay zekâ (öğretmen, podcast, hikâye, asistan)</h3>
      <p className="small">
        Öğretmenle sohbet, podcast'e dönüştürme, hikâye yazma, sayfayı anlatma ve asistan için ücretsiz bir yapay zekâ anahtarı ekle. En kolayı:{" "}
        <b>Google Gemini</b> — <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer noopener">aistudio.google.com/apikey</a> adresinde Google hesabınla
        “Create API key”e bas, anahtarı kopyalayıp aşağıya yapıştır. Kredi kartı gerekmez.
      </p>
      <div className="form">
        <label>
          Servis
          <select
            value={preset.id}
            onChange={(e) => {
              const p = LLM_PRESETS.find((x) => x.id === e.target.value)!;
              setModels([]);
              setStatus("");
              setSettings((s) => ({ ...s, llmProvider: p.id, llmBaseUrl: p.baseUrl || s.llmBaseUrl, llmModel: p.model || s.llmModel }));
            }}
          >
            {LLM_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          API anahtarı (yalnızca bu telefonda saklanır)
          <input
            type="password"
            autoComplete="off"
            value={settings.llmKey}
            placeholder="Anahtarı yapıştır…"
            onChange={(e) => setSettings((s) => ({ ...s, llmKey: e.target.value.trim() }))}
          />
        </label>
        <label>
          Model
          <input list="llm-models" value={settings.llmModel} onChange={(e) => setSettings((s) => ({ ...s, llmModel: e.target.value.trim() }))} />
          <datalist id="llm-models">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        {preset.id === "custom" && (
          <label>
            Servis adresi (OpenAI uyumlu)
            <input value={settings.llmBaseUrl} placeholder="https://…/v1" onChange={(e) => setSettings((s) => ({ ...s, llmBaseUrl: e.target.value.trim() }))} />
          </label>
        )}
      </div>
      <p className="muted small">
        {preset.note}
        {preset.keyUrl && (
          <>
            {" "}
            Anahtar al:{" "}
            <a href={preset.keyUrl} target="_blank" rel="noreferrer noopener">
              {preset.keyUrl.replace(/^https:\/\//, "")}
            </a>
          </>
        )}
      </p>
      <div className="row wrap">
        <button className="btn primary" disabled={busy || !settings.llmKey} onClick={test}>
          Dene
        </button>
        <button
          className="btn"
          disabled={busy || !settings.llmKey}
          onClick={async () => {
            try {
              const list = await listModels(settings.llmBaseUrl, settings.llmKey);
              setModels(list);
              setStatus(`${list.length} model bulundu; Model kutusuna dokunup seçebilirsin.`);
            } catch (e) {
              setStatus(`❌ ${(e as Error).message}`);
            }
          }}
        >
          Modelleri listele
        </button>
        {settings.llmKey && (
          <button className="btn ghost" onClick={() => (setSettings((s) => ({ ...s, llmKey: "" })), setStatus(""))}>
            Anahtarı sil
          </button>
        )}
      </div>
      {status && <p className="small">{status}</p>}
    </div>
  );
}
