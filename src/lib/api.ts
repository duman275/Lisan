export interface StreamHandlers {
  onText?: (chunk: string, full: string) => void;
  onStatus?: (text: string) => void;
  onSource?: (s: { url: string; title: string }) => void;
}

export interface StreamResult {
  text: string;
  sources: { url: string; title: string }[];
}

/** Sunucudaki /api/stream uç noktasından SSE akışını okur. */
import { getSettings } from "./store";

const withProvider = (body: Record<string, unknown>) => ({ provider: getSettings().agentProvider, ...body });

export async function streamAI(body: Record<string, unknown>, h: StreamHandlers = {}, signal?: AbortSignal): Promise<StreamResult> {
  const res = await fetch("/api/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withProvider(body)),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: `Sunucu hatası (${res.status})` }));
    throw new Error(err.error || `Sunucu hatası (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  const sources: StreamResult["sources"] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.type === "text") {
        full += ev.text;
        h.onText?.(ev.text, full);
      } else if (ev.type === "status") h.onStatus?.(ev.text);
      else if (ev.type === "source") {
        sources.push({ url: ev.url, title: ev.title });
        h.onSource?.(ev);
      } else if (ev.type === "error") throw new Error(ev.text);
    }
  }
  return { text: full, sources };
}

export async function jsonAI<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withProvider(body)),
  });
  const data = await res.json().catch(() => ({ error: `Sunucu hatası (${res.status})` }));
  if (!res.ok) throw new Error(data.error || `Sunucu hatası (${res.status})`);
  return data as T;
}

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({ error: `Sunucu hatası (${res.status})` }));
  if (!res.ok) throw new Error(data.error || `Sunucu hatası (${res.status})`);
  return data as T;
}
