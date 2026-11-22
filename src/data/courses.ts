// CEFR müfredatının yanında, belirli bir beceriye odaklanan kurslar.
// İçerik her dile uygulanır; "native" kursu özellikle İngilizce için tasarlanmıştır.

export interface Course {
  id: "daily" | "speaking" | "native" | "business";
  icon: string;
  name: string;
  nameEn?: string; // İngilizce öğrenirken gösterilecek ad
  level: string; // önerilen seviye aralığı
  lessonLevel: string; // ders üretiminde kullanılacak CEFR
  desc: string;
  focus: string; // modele giden odak açıklaması
  units: string[];
}

export const COURSES: Course[] = [
  {
    id: "daily",
    icon: "☕",
    name: "Günlük Konuşma",
    nameEn: "Everyday English",
    level: "A2 → B1",
    lessonLevel: "B1",
    desc: "Gerçek hayatta en çok kullanılan konuşma kalıpları: sohbet açmak, plan yapmak, rica etmek, şikâyet etmek. Ders kitabı dili değil, insanların gerçekten konuştuğu dil.",
    focus:
      "Everyday spoken conversation as real people speak it (not textbook language). Teach high-frequency conversational chunks and natural responses, contractions, polite softeners, and typical back-and-forth. Dialogue must sound like a real conversation between friends, colleagues or strangers, with natural reactions.",
    units: [
      "Selamlaşma ve sohbet açma (small talk): Hava, hafta sonu, iş",
      "Kafede, restoranda sipariş ve hesap",
      "Arkadaşla plan yapma, davet etme, reddetme",
      "Telefonda ve mesajlaşırken konuşma",
      "Yol sorma, ulaşım, taksi ve toplu taşıma",
      "Alışveriş: beden, iade, pazarlık",
      "Rica etme ve yardım isteme (kibar kalıplar)",
      "Şikâyet etme ve sorun bildirme",
      "Doktorda, eczanede",
      "Duyguları ifade etme: sevinç, üzüntü, şaşkınlık",
      "Hikâye anlatma: Bugün başıma ne geldi biliyor musun?",
      "Fikir sorma ve fikir belirtme",
      "Teşekkür, özür ve iltifatlara doğal cevaplar",
      "Komşular, ev arkadaşları ve ev işleri",
      "Vedalaşma ve konuşmayı kibarca bitirme",
    ],
  },
  {
    id: "speaking",
    icon: "🎤",
    name: "Konuşma Akıcılığı",
    nameEn: "Speaking Fluency",
    level: "A2 → C1",
    lessonLevel: "B1",
    desc: "Bildiğin dili ağzından çıkarabilme kursu. Düşünürken boşluk doldurma, cümleyi toparlama, takılmadan konuşma, telaffuz ve tonlama. Her derste bol gölgeleme ve sesli alıştırma.",
    focus:
      "Speaking fluency. Teach fillers and thinking phrases, linking words for speaking, paraphrasing when you don't know a word, rhythm, word stress, intonation and connected speech. The shadowing sentences are the core of the lesson: make them natural, rhythmic and useful. Exercises should prompt the learner to produce spoken-style answers.",
    units: [
      "Düşünürken zaman kazanma: well, let me think, you know",
      "Bilmediğin kelimeyi başka yoldan anlatma",
      "Kısa cevap yerine konuşmayı sürdürme (follow-up soruları)",
      "Kendinden 2 dakika bahsetme",
      "Geçmişte yaşanan bir olayı akıcı anlatma",
      "Görüş bildirme ve gerekçelendirme",
      "Karşılaştırma ve tercih anlatma",
      "Vurgu ve tonlama: anlamı değiştiren ses",
      "Bağlantılı konuşma: kelimeleri birleştirme (linking)",
      "Zor seslerin telaffuzu (Türkçe konuşanlar için)",
      "Bir resmi/sahneyi betimleme",
      "Hipotetik konuşma: Olsaydım ne yapardım?",
    ],
  },
  {
    id: "native",
    icon: "🗽",
    name: "Native gibi konuş",
    nameEn: "Native English",
    level: "B2 → C2",
    lessonLevel: "B2",
    desc: "Ana dili İngilizce olanların gerçekten kullandığı dil: phrasal verb'ler, deyimler, argo, kısaltmalar (gonna, wanna), dizi ve film dili, Amerikan ve İngiliz farkları, ironi ve mizah.",
    focus:
      "Native-speaker English as actually spoken in the US and UK today: phrasal verbs, idioms, current informal slang (marked as informal/slang, avoid offensive words), reductions and connected speech (gonna, wanna, gotta, kinda, y'know), discourse markers, hedging, sarcasm and understatement, and the differences between American and British usage. Dialogue should feel like a scene from a modern TV series. In the explanation, show 'textbook' vs 'how natives say it' side by side.",
    units: [
      "Gonna, wanna, gotta: konuşmadaki kısaltmalar",
      "En sık 30 phrasal verb (get, go, come, put, take)",
      "Günlük deyimler: piece of cake, call it a day…",
      "Güncel argo ve gençlerin dili (informal)",
      "Ders kitabı vs gerçek hayat: doğal cevaplar",
      "Amerikan ve İngiliz İngilizcesi farkları",
      "İroni, alay (sarcasm) ve İngiliz alçakgönüllülüğü",
      "Konuşmayı yumuşatma: kinda, sort of, I guess",
      "Dizi ve film diliyle dinleme (hızlı konuşma)",
      "Mesajlaşma ve sosyal medya kısaltmaları",
      "Bağlantılı konuşma ve schwa: native aksanının sırrı",
      "Tepki ifadeleri: No way!, That's wild, Fair enough",
      "İş yerinde doğal dil ve kurumsal klişeler",
      "Mizah, kelime oyunları ve espri anlama",
      "Kültürel göndermeler: ünlü replikler ve atasözleri",
    ],
  },
  {
    id: "business",
    icon: "💼",
    name: "İş Dili",
    nameEn: "Business English",
    level: "B1 → C1",
    lessonLevel: "B2",
    desc: "Toplantı, e-posta, sunum, mülakat ve müzakere için profesyonel ama doğal dil.",
    focus:
      "Professional workplace language that is polite, clear and natural: meetings, emails, presentations, interviews, negotiation and small talk with colleagues. Show formal vs neutral alternatives.",
    units: [
      "Kendini profesyonel tanıtma ve iş sohbeti",
      "Toplantıya katılma, söz alma ve araya girme",
      "Kısa ve net e-posta yazma",
      "Sunum açma, slayt anlatma, soru alma",
      "İş mülakatı: kendini anlatma ve zor sorular",
      "Müzakere ve teklif verme",
      "Geri bildirim verme ve alma",
      "Telefon ve video görüşmeleri",
      "Sorun çözme ve kriz iletişimi",
      "Networking ve LinkedIn dili",
    ],
  },
];

export function courseName(c: Course, lang: string) {
  return lang.startsWith("en") && c.nameEn ? `${c.name} (${c.nameEn})` : c.name;
}
