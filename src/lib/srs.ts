// Aralıklı tekrar: SM-2 tabanlı, 4 düğmeli (Tekrar / Zor / İyi / Kolay) zamanlayıcı.

export interface Card {
  id: string;
  lang: string; // hedef dil kodu
  word: string;
  reading?: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
  ease: number; // kolaylık katsayısı (≥1.3)
  interval: number; // gün
  reps: number;
  lapses: number;
  due: number; // epoch ms
  added: number;
}

export type Grade = 0 | 1 | 2 | 3; // tekrar, zor, iyi, kolay

const DAY = 86_400_000;

export function newCard(lang: string, c: Pick<Card, "word" | "translation"> & Partial<Card>): Card {
  return {
    id: `${lang}:${c.word.toLowerCase()}`,
    lang,
    reading: c.reading,
    word: c.word,
    translation: c.translation,
    example: c.example,
    exampleTranslation: c.exampleTranslation,
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: Date.now(),
    added: Date.now(),
  };
}

export function schedule(card: Card, grade: Grade, now = Date.now()): Card {
  const c = { ...card };
  if (grade === 0) {
    c.lapses += 1;
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = now + 60_000 * 5; // 5 dakika sonra aynı oturumda tekrar
    return c;
  }
  c.reps += 1;
  if (c.reps === 1) c.interval = grade === 3 ? 3 : 1;
  else if (c.reps === 2) c.interval = grade === 1 ? 2 : grade === 3 ? 7 : 4;
  else c.interval = Math.round(c.interval * (grade === 1 ? 1.2 : grade === 3 ? c.ease * 1.3 : c.ease));
  c.ease = Math.max(1.3, c.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  // Aynı güne yığılmayı önlemek için küçük rastgelelik
  const fuzz = c.interval > 4 ? Math.round(c.interval * (Math.random() * 0.1 - 0.05)) : 0;
  c.interval = Math.max(1, c.interval + fuzz);
  c.due = now + c.interval * DAY;
  return c;
}

export function previewInterval(card: Card, grade: Grade): string {
  if (grade === 0) return "5 dk";
  const d = schedule(card, grade, 0).interval;
  if (d < 30) return `${d} g`;
  if (d < 365) return `${Math.round(d / 30)} ay`;
  return `${(d / 365).toFixed(1)} yıl`;
}

export function isMature(c: Card) {
  return c.interval >= 21;
}
