// Sunucu tarafı: data/ klasöründeki ücretsiz veriyi diskten yükler; mantık shared/freeCore.ts'tedir.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { freeReady, initFreeData } from "../shared/freeCore.ts";

export * from "../shared/freeCore.ts";

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");

export function loadFreeData(): boolean {
  if (freeReady()) return true;
  if (!existsSync(path.join(DATA, "en-tr.tsv.gz"))) return false;
  const read = (f: string) => gunzipSync(readFileSync(path.join(DATA, f))).toString("utf8");
  initFreeData({ pairsTsv: read("en-tr.tsv.gz"), glossJson: read("gloss-en-tr.json.gz"), freqEnTxt: read("freq-en.txt.gz") });
  return true;
}

export function freeAvailable() {
  return loadFreeData();
}
