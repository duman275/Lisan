// Evren (fantastik/bilimkurgu dünyası) veri modeli: kitaplar, uyarlamalar, semboller, temalar, teoriler, söyleşiler ve kaynaklar.

export interface UBook {
  title: string;
  tr: string;
  year: string;
  note: string;
}

export interface UTopic {
  id: string;
  title: string;
  en: string; // aramalarda kullanılacak İngilizce terim
  text: string;
  spoiler?: boolean;
  status?: string; // teoriler için: doğrulandı / açık / tartışmalı
}

export interface ULink {
  name: string;
  url: (q: string) => string;
}

export interface UChannel {
  name: string;
  lang: "tr" | "en";
}

export type USection =
  | { id: string; label: string; kind: "books"; intro?: string; groups: { title?: string; books: UBook[] }[] }
  | { id: string; label: string; kind: "topics"; intro?: string; items: UTopic[] };

export interface UniverseData {
  id: string;
  title: string;
  icon: string;
  author: string;
  analysisTitle: string; // analizde kullanılan eser adı (İngilizce)
  intro: string;
  copyrightNote: string;
  sections: USection[];
  wikis: ULink[];
  channels: UChannel[];
  homepages: { name: string; url: string; note: string }[];
  /** Yapay zekâ analizine verilen kaynak ipuçları; "mw:<api>|<site>|<etiket>" biçimindekiler MediaWiki sitesinden bağlam çeker */
  hints: string[];
  cardNote: string;
}

/** Kullanıcının önerdiği Türkçe kanallar — her evrende kullanılır */
export const TR_CHANNELS: UChannel[] = [
  { name: "Geek Teori", lang: "tr" },
  { name: "Karakare", lang: "tr" },
  { name: "Legendarium Türkiye", lang: "tr" },
  { name: "40ip", lang: "tr" },
  { name: "Argümento", lang: "tr" },
  { name: "Umur Tezer", lang: "tr" },
];

export const reddit = (sub: string): ULink => ({ name: `Reddit r/${sub}`, url: (q) => `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(q)}` });
export const fandom = (name: string, host: string): ULink => ({ name, url: (q) => `https://${host}/wiki/Special:Search?query=${encodeURIComponent(q)}` });
export const siteSearch = (name: string, site: string, extra = ""): ULink => ({
  name,
  url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${extra} ${q}`.replace(/\s+/g, " ").trim())}`,
});

export const ytSearch = (ch: UChannel, topicTr: string, topicEn: string, universe: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ch.name} ${ch.lang === "tr" ? topicTr : topicEn} ${ch.lang === "tr" ? "" : universe}`.trim())}`;
