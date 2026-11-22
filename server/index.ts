import "./env.ts";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aiAvailable, describeError, jsonTask, MODEL, streamTask, type JsonRequest, type StreamRequest } from "./ai.ts";
import { bookText, searchBooks } from "./books.ts";
import { AGENT_MODEL, agentTurn, checkOllama, OLLAMA_MODEL, pickProvider, type AgentMsg } from "./agent.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "4mb" }));

// Basit hız sınırı: IP başına dakikada 30 yapay zekâ isteği.
const hits = new Map<string, number[]>();
function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.ip || "?";
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (list.length >= 30) {
    res.status(429).json({ error: "Çok fazla istek, bir dakika bekleyin." });
    return;
  }
  list.push(now);
  hits.set(key, list);
  next();
}

function requireAi(_req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!aiAvailable()) {
    res.status(503).json({ error: "Yapay zekâ özellikleri için sunucuda ANTHROPIC_API_KEY tanımlanmalı (.env dosyasına bakın)." });
    return;
  }
  next();
}

app.get("/api/health", async (_req, res) => {
  const ollama = await checkOllama();
  res.json({
    ok: true,
    ai: aiAvailable(),
    model: MODEL,
    agent: { claude: aiAvailable(), claudeModel: AGENT_MODEL, ollama: ollama.available, ollamaModel: OLLAMA_MODEL, ollamaModels: ollama.models },
  });
});

// Yardımcı ajan: modelin bir turunu yürütür; araçları tarayıcı çalıştırır.
app.post("/api/agent", rateLimit, async (req, res) => {
  const { history, state, provider: pref } = req.body as { history: AgentMsg[]; state?: string; provider?: string };
  const provider = await pickProvider(pref);
  if (!provider) {
    res.status(503).json({
      error: "Asistan için ya sunucuda ANTHROPIC_API_KEY tanımlayın ya da bilgisayarınızda ücretsiz Ollama'yı çalıştırın (README'ye bakın). Basit sesli komutlar (duraklat, devam, sonraki, sekme aç) yine de çalışır.",
    });
    return;
  }
  if (!Array.isArray(history) || history.length > 80) {
    res.status(400).json({ error: "Geçersiz sohbet geçmişi" });
    return;
  }
  try {
    res.json(await agentTurn(history, String(state || "").slice(0, 6000), provider));
  } catch (err) {
    res.status(502).json({ error: describeError(err) });
  }
});

const STREAM_TASKS = new Set(["tutor", "story", "summary", "analysis", "explain"]);
app.post("/api/stream", requireAi, rateLimit, async (req, res) => {
  const body = req.body as StreamRequest;
  if (!STREAM_TASKS.has(body?.task)) {
    res.status(400).json({ error: "Bilinmeyen görev" });
    return;
  }
  await streamTask(body, res);
});

const JSON_TASKS = new Set(["lesson", "deck", "define", "placement", "podcast", "translate"]);
app.post("/api/json", requireAi, rateLimit, async (req, res) => {
  const body = req.body as JsonRequest;
  if (!JSON_TASKS.has(body?.task)) {
    res.status(400).json({ error: "Bilinmeyen görev" });
    return;
  }
  try {
    res.json(await jsonTask(body));
  } catch (err) {
    res.status(502).json({ error: describeError(err) });
  }
});

app.get("/api/books/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.json([]);
      return;
    }
    res.json(await searchBooks(q, req.query.lang ? String(req.query.lang) : undefined));
  } catch (err) {
    res.status(502).json({ error: describeError(err) });
  }
});

app.get("/api/books/:id/text", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Geçersiz kitap numarası" });
      return;
    }
    res.json(await bookText(id));
  } catch (err) {
    res.status(502).json({ error: describeError(err) });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(here, "../dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Lisan API http://localhost:${port}  (model: ${MODEL}, yapay zekâ: ${aiAvailable() ? "açık" : "kapalı — ANTHROPIC_API_KEY yok"})`);
});
