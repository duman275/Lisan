// Ses kataloğu: ücretsiz nöral sesler (Piper, cihazda çalışır) + cihazın kendi sesleri.

export type Gender = "f" | "m" | "?";

export interface NeuralVoice {
  id: string; // Piper ses kimliği
  lang: string; // ISO dil kodu (tr, en, de…)
  name: string;
  gender: Gender;
  accent?: string;
  quality: "düşük" | "orta" | "yüksek";
}

const V = (id: string, name: string, gender: Gender, accent?: string): NeuralVoice => ({
  id,
  lang: id.slice(0, 2),
  name,
  gender,
  accent,
  quality: id.endsWith("high") ? "yüksek" : id.endsWith("medium") ? "orta" : "düşük",
});

/** Piper nöral sesleri (MIT/CC lisanslı açık modeller). İlk kullanımda bir kez indirilir (≈20–60 MB), sonra çevrimdışı çalışır. */
export const NEURAL_VOICES: NeuralVoice[] = [
  V("tr_TR-fahrettin-medium", "Fahrettin", "m"),
  V("tr_TR-fettah-medium", "Fettah", "m"),
  V("tr_TR-dfki-medium", "DFKI", "m"),
  V("en_US-amy-medium", "Amy", "f", "ABD"),
  V("en_US-kristin-medium", "Kristin", "f", "ABD"),
  V("en_US-hfc_female-medium", "Hannah (HFC)", "f", "ABD"),
  V("en_US-lessac-medium", "Lessac", "f", "ABD"),
  V("en_US-ljspeech-high", "Linda (LJ)", "f", "ABD"),
  V("en_US-ryan-high", "Ryan", "m", "ABD"),
  V("en_US-joe-medium", "Joe", "m", "ABD"),
  V("en_US-hfc_male-medium", "Henry (HFC)", "m", "ABD"),
  V("en_US-kusal-medium", "Kusal", "m", "ABD"),
  V("en_GB-alba-medium", "Alba", "f", "İskoç"),
  V("en_GB-jenny_dioco-medium", "Jenny", "f", "İngiliz"),
  V("en_GB-cori-high", "Cori", "f", "İngiliz"),
  V("en_GB-alan-medium", "Alan", "m", "İngiliz"),
  V("en_GB-northern_english_male-medium", "Kuzeyli", "m", "Kuzey İngiltere"),
  V("de_DE-kerstin-low", "Kerstin", "f"),
  V("de_DE-ramona-low", "Ramona", "f"),
  V("de_DE-thorsten-high", "Thorsten", "m"),
  V("de_DE-karlsson-low", "Karlsson", "m"),
  V("fr_FR-siwis-medium", "Siwis", "f"),
  V("fr_FR-tom-medium", "Tom", "m"),
  V("es_ES-davefx-medium", "Davefx", "m", "İspanya"),
  V("es_MX-ald-medium", "Ald", "m", "Meksika"),
  V("it_IT-riccardo-x_low", "Riccardo", "m"),
  V("pt_BR-faber-medium", "Faber", "m", "Brezilya"),
  V("nl_BE-nathalie-medium", "Nathalie", "f", "Belçika"),
  V("nl_BE-rdh-medium", "RDH", "m", "Belçika"),
  V("ru_RU-irina-medium", "Irina", "f"),
  V("ru_RU-dmitri-medium", "Dmitri", "m"),
  V("ru_RU-denis-medium", "Denis", "m"),
  V("ar_JO-kareem-medium", "Kareem", "m", "Ürdün"),
  V("zh_CN-huayan-medium", "Huayan", "f"),
];

export const NEURAL_PREFIX = "piper:";

export function neuralFor(lang?: string): NeuralVoice[] {
  const p = (lang || "").slice(0, 2).toLowerCase();
  return NEURAL_VOICES.filter((v) => v.lang === p);
}

// Cihaz seslerinde cinsiyet tahmini (adlardan). Bilinmiyorsa "?".
const FEMALE = /female|woman|kadın|\b(emel|yelda|seda|filiz|zeynep|samantha|zira|karen|victoria|moira|tessa|fiona|amelie|anna|paulina|monica|alice|luciana|milena|ting-?ting|mei-?jia|kyoko|yuna|laila|ellen|sara|helena|hortense|hedda|elsa|elena|irina|katja|hazel|susan|linda|heera|aria|jenny|sonia|libby|natasha|emma|ava|allison|joanna|kendra|kimberly|salli|ivy|serena|kate|catherine|marie|denise|julie|lucia|isabella|elsa|nathalie|ewa|mariska|sin-ji|xiaoxiao|nanami|sunhi|zariyah|salma|hoda)\b/i;
const MALE = /\bmale\b|man\b|erkek|\b(ahmet|tolga|cem|daniel|alex|david|mark|fred|jorge|diego|thomas|yuri|maged|ryan|guy|christopher|eric|brian|rishi|xander|reed|rocko|eddy|grandpa|aaron|arthur|george|james|oliver|tom|luca|cosimo|stefan|conrad|henri|alvaro|antonio|dmitry|pavel|hamed|naayf|kangkang|yunyang|keita|injoon|maarten|hans|paul|matthew|justin|joey|russell|geraint)\b/i;

export function deviceGender(v: SpeechSynthesisVoice): Gender {
  if (FEMALE.test(v.name)) return "f";
  if (MALE.test(v.name)) return "m";
  return "?";
}

export const GENDER_ICON: Record<Gender, string> = { f: "♀ Kadın", m: "♂ Erkek", "?": "" };
