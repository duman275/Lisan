import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfResult {
  title: string;
  pages: string[];
}

/** PDF'ten sayfa sayfa metin çıkarır (satır sonlarını ve tirelemeyi düzeltir). */
export async function extractPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<PdfResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        // Yeni satır: büyük dikey boşluk paragraf sayılır
        text += Math.abs(y - lastY) > (item.height || 10) * 1.8 ? "\n\n" : "\n";
      }
      text += item.str;
      if (item.hasEOL) text += "\n";
      lastY = y;
    }
    text = text
      .replace(/(\p{L})-\n(\p{L})/gu, "$1$2")
      .replace(/([^\n])\n(?!\n)/g, "$1 ")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(text);
    onProgress?.(i, doc.numPages);
  }
  const meta = await doc.getMetadata().catch(() => null);
  const info = meta?.info as { Title?: string } | undefined;
  return { title: info?.Title?.trim() || file.name.replace(/\.pdf$/i, ""), pages };
}
