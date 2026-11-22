export interface Language {
  code: string; // BCP-47 (ses ve konuşma tanıma için)
  name: string; // modele gönderilen ad
  label: string; // arayüzde görünen ad
  flag: string;
  /** Yabancı Dil Enstitüsü (FSI) tahmini: anadili İngilizce olan için B2–C1 için gereken ders saati */
  fsiHours: number;
}

export const LANGUAGES: Language[] = [
  { code: "en-US", name: "English", label: "İngilizce", flag: "🇬🇧", fsiHours: 600 },
  { code: "de-DE", name: "German", label: "Almanca", flag: "🇩🇪", fsiHours: 900 },
  { code: "fr-FR", name: "French", label: "Fransızca", flag: "🇫🇷", fsiHours: 750 },
  { code: "es-ES", name: "Spanish", label: "İspanyolca", flag: "🇪🇸", fsiHours: 600 },
  { code: "it-IT", name: "Italian", label: "İtalyanca", flag: "🇮🇹", fsiHours: 650 },
  { code: "pt-BR", name: "Portuguese", label: "Portekizce", flag: "🇧🇷", fsiHours: 650 },
  { code: "nl-NL", name: "Dutch", label: "Felemenkçe", flag: "🇳🇱", fsiHours: 650 },
  { code: "ru-RU", name: "Russian", label: "Rusça", flag: "🇷🇺", fsiHours: 1100 },
  { code: "ar-SA", name: "Arabic", label: "Arapça", flag: "🇸🇦", fsiHours: 2200 },
  { code: "ja-JP", name: "Japanese", label: "Japonca", flag: "🇯🇵", fsiHours: 2200 },
  { code: "ko-KR", name: "Korean", label: "Korece", flag: "🇰🇷", fsiHours: 2200 },
  { code: "zh-CN", name: "Mandarin Chinese", label: "Çince", flag: "🇨🇳", fsiHours: 2200 },
  { code: "tr-TR", name: "Turkish", label: "Türkçe", flag: "🇹🇷", fsiHours: 1100 },
];

export const NATIVE_LANGUAGES = [
  { code: "tr-TR", name: "Türkçe" },
  { code: "en-US", name: "English" },
  { code: "de-DE", name: "Deutsch" },
];

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_INFO: Record<Level, { name: string; can: string; words: string }> = {
  A1: { name: "Başlangıç", can: "Kendini tanıtır, basit sorular sorar ve yanıtlar.", words: "≈500 kelime" },
  A2: { name: "Temel", can: "Günlük işleri halleder, alışveriş, yol tarifi, geçmiş olaylar.", words: "≈1.000 kelime" },
  B1: { name: "Orta", can: "Seyahatte rahat, deneyim ve görüş anlatır, dizileri altyazıyla izler.", words: "≈2.000 kelime" },
  B2: { name: "Orta üstü", can: "Ana dili konuşanlarla akıcı konuşur, haber ve romanların çoğunu anlar.", words: "≈4.000 kelime" },
  C1: { name: "İleri", can: "Akademik/iş ortamında esnek ve etkili kullanır, ince anlamları yakalar.", words: "≈8.000 kelime" },
  C2: { name: "Ustalık", can: "Neredeyse ana dil düzeyi: edebiyat, mizah, ima ve üslup farkları.", words: "≈16.000+ kelime" },
};

export function langByCode(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
