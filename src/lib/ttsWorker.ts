// Nöral ses (Piper) sentezi ayrı bir iş parçacığında: arayüz donmaz.
// Model (onnx) her ses için yalnızca bir kez yüklenir ve bellekte tutulur.
import { HF_BASE, ONNX_BASE, PATH_MAP, WASM_BASE } from "@diffusionstudio/vits-web";
// Paket bu dosyayı dışa açmıyor; yol üzerinden alıyoruz
// @ts-expect-error tip bildirimi yok
import { createPiperPhonemize } from "../../node_modules/@diffusionstudio/vits-web/dist/piper-DeOu3H9E.js";
import type * as Ort from "onnxruntime-web";

type Req = { id: number; text: string; voiceId: string };
type VoiceConf = { espeak: { voice: string }; audio: { sample_rate: number }; inference: { noise_scale: number; length_scale: number; noise_w: number }; speaker_id_map: Record<string, number> };

let ort: typeof Ort | null = null;
const sessions = new Map<string, Promise<{ conf: VoiceConf; session: Ort.InferenceSession }>>();

async function cached(url: string): Promise<Blob> {
  const name = url.split("/").at(-1)!;
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle("piper", { create: true });
    try {
      return await (await dir.getFileHandle(name)).getFile();
    } catch {
      /* yok: indir */
    }
    const blob = await (await fetch(url)).blob();
    try {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(blob);
      await w.close();
    } catch {
      /* önbelleğe yazılamadı: sorun değil */
    }
    return blob;
  } catch {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Ses modeli indirilemedi (${r.status})`);
    return r.blob();
  }
}

function voice(voiceId: string) {
  let s = sessions.get(voiceId);
  if (!s) {
    s = (async () => {
      ort ??= await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = ONNX_BASE;
      ort.env.wasm.numThreads = 1;
      const path = (PATH_MAP as Record<string, string>)[voiceId];
      if (!path) throw new Error(`Bilinmeyen ses: ${voiceId}`);
      const conf = JSON.parse(await (await cached(`${HF_BASE}/${path}.json`)).text()) as VoiceConf;
      const model = await cached(`${HF_BASE}/${path}`);
      const session = await ort.InferenceSession.create(new Uint8Array(await model.arrayBuffer()));
      return { conf, session };
    })();
    s.catch(() => sessions.delete(voiceId));
    // Bellek: en fazla 2 ses açık tutulur
    if (sessions.size >= 2) sessions.delete(sessions.keys().next().value!);
    sessions.set(voiceId, s);
  }
  return s;
}

async function phonemize(text: string, espeakVoice: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    createPiperPhonemize({
      print: (l: string) => resolve(JSON.parse(l).phoneme_ids),
      printErr: (l: string) => reject(new Error(l)),
      locateFile: (l: string) => (l.endsWith(".wasm") ? `${WASM_BASE}.wasm` : l.endsWith(".data") ? `${WASM_BASE}.data` : l),
    })
      .then((m: { callMain: (a: string[]) => void }) =>
        m.callMain(["-l", espeakVoice, "--input", JSON.stringify([{ text: text.trim() }]), "--espeak_data", "/espeak-ng-data"]),
      )
      .catch(reject);
  });
}

function wav(data: Float32Array, rate: number): ArrayBuffer {
  const n = data.length;
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  return v.buffer;
}

// İstekler sırayla işlenir (aynı anda tek sentez)
let queue: Promise<unknown> = Promise.resolve();
self.onmessage = (ev: MessageEvent<Req | { cancelBelow: number }>) => {
  const d = ev.data;
  if ("cancelBelow" in d) {
    cancelBelow = d.cancelBelow;
    return;
  }
  queue = queue.then(() => run(d));
};
let cancelBelow = 0;

async function run({ id, text, voiceId }: Req) {
  if (id < cancelBelow) return self.postMessage({ id, error: "canceled" });
  try {
    const { conf, session } = await voice(voiceId);
    const ids = await phonemize(text, conf.espeak.voice);
    const o = ort!;
    const feeds: Record<string, Ort.Tensor> = {
      input: new o.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new o.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new o.Tensor("float32", Float32Array.from([conf.inference.noise_scale, conf.inference.length_scale, conf.inference.noise_w]), [3]),
    };
    if (Object.keys(conf.speaker_id_map || {}).length) feeds.sid = new o.Tensor("int64", BigInt64Array.from([0n]), [1]);
    const out = await session.run(feeds);
    const buf = wav(out.output.data as Float32Array, conf.audio.sample_rate);
    (self as unknown as Worker).postMessage({ id, wav: buf }, [buf]);
  } catch (e) {
    self.postMessage({ id, error: (e as Error).message || String(e) });
  }
}
