import "./env.ts";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aiAvailable, describeError, jsonTask, MODEL, streamTask, type JsonRequest, type StreamRequest } from "./ai.ts";
import { bookText, searchBooks } from "./books.ts";

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiAvailable(), model: MODEL });
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
