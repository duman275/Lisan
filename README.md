# Lisan — dil öğren, kitap dinle, edebiyatı derinlemesine anla

Lisan; çok dilli bir dil öğrenme sistemi, sesli kitap/podcast okuyucu, PDF anlatıcı ve web destekli edebi analiz aracını tek uygulamada birleştirir. Arayüz Türkçedir, yapay zekâ özellikleri Claude API ile çalışır.

## Özellikler

### 🎓 Dil öğrenme (A1 → C2)
13 dil: İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Felemenkçe, Rusça, Arapça, Japonca, Korece, Çince, Türkçe.

Uygulama, etkisi en iyi kanıtlanmış yöntemleri günlük bir akışta birleştirir:

| Yöntem | Uygulamadaki karşılığı |
|---|---|
| Önce sıklık (Pareto) | Desteler gerçek kullanım sıklığına göre sıralı üretilir, bildiğin kelimeler tekrar edilmez |
| Aralıklı tekrar (SRS) | SM-2 tabanlı 4 düğmeli kartlar (Tekrar/Zor/İyi/Kolay), ters yön çalışma |
| Anlaşılır girdi (i+1) | Seviyene göre yazılan hikâyeler, dokunarak kelime anlamı ve desteye ekleme |
| Dinle & gölgele | Her derste gölgeleme cümleleri, mikrofonla telaffuz puanı |
| Çıktı + anında düzeltme | Yapay zekâ öğretmen: serbest sohbet, rol yapma, münazara, gramer koçu, kitap kulübü |
| Etkin hatırlama | Her ünitede çoktan seçmeli, boşluk doldurma ve çeviri alıştırmaları |

Ayrıca: seviye tespit sınavı (18 soru), seviye başına 10 ünitelik müfredat (60 ünite), günlük plan, XP, seri ve haftalık grafik.

### 📚 Kitap okuyucu ve podcast modu
- Cümle cümle **sesli okuma** ve vurgulama, kaldığın yeri hatırlama
- Ses seçimi, **anlatım tarzları** (Masalcı, Derin & ciddi, Enerjik podcast, Dil öğrencisi…), hız ayarı, **uyku zamanlayıcısı**, medya tuşu ve kilit ekranı desteği
- **🎙 Podcast'e dönüştür:** bölümü, iki sunucunun konuştuğu bir podcast bölümüne çevirir ve iki farklı sesle oynatır
- **🧠 Bana anlat:** sayfayı yeniden anlatır ve açıklar, sesli dinlenir
- Dokunduğun kelimenin bağlama göre anlamı ve desteye ekleme
- Project Gutenberg'den 75.000+ telifsiz kitap: ara, indir, oku/dinle

### 📄 PDF yükle → dinle ve anlat
PDF tarayıcıda işlenir (sunucuya yüklenmez), metni çıkarılır, kütüphaneye eklenir. Ardından sesli okunur, sayfa sayfa anlatılır, podcast'e çevrilir veya tamamı özetlenir. Taranmış (yalnızca görüntü içeren) PDF'lerde metin katmanı olmadığı için uyarı verilir.

### 🏛️ Efsane Kitaplar kataloğu
13 kategoride 100+ kitap: Dünya Klasikleri, Rus Edebiyatı, Distopya, Bilimkurgu, Fantastik & Mitoloji, Polisiye & Gerilim, Felsefe, Varoluşçuluk & Modern Klasikler, Latin Amerika & Büyülü Gerçekçilik, Türk Edebiyatı, Şiir & Tiyatro, Çocuk & Masal Klasikleri, Tarih/Bilim/Fikir. Telifsiz olanlar tek tıkla açılıp dinlenir; tümü için özet ve analiz alınabilir.

### 🧾 Özetler
5 dakikalık sesli özet, bölüm bölüm detaylı özet, karakter rehberi veya ana fikirler. Dinle, kütüphaneye kaydet.

### 🔎 Derin analiz: sembolizm, temalar, alt metin
Claude önce **web'de araştırır**: yazar söyleşileri, yayımlanmış eleştiriler, film/dizi uyarlamaları, Reddit tartışmaları, fandom wiki'leri, Goodreads. Sonra metnin gösterdiklerini, yazarın söylediklerini, akademik yorumları ve hayran teorilerini **ayrı ayrı ve kaynaklarıyla** anlatır. Odak seçilebilir: semboller, temalar, alt metin, karakter psikolojisi, tarihsel bağlam, uyarlamalar, fan teorileri, anlatım tekniği…

## Kurulum

Gereksinim: Node.js 22+

```bash
cd lisan
npm install
cp .env.example .env      # ANTHROPIC_API_KEY değerini gir
npm run dev               # http://localhost:5173
```

Üretim:

```bash
npm run build
npm start                 # http://localhost:8787 (API + arayüz tek sunucuda)
```

API anahtarı olmadan da açılır: kitap okuma, sesli dinleme, PDF, kartlar ve hazır deste çalışır; yapay zekâ özellikleri (dersler, öğretmen, hikâye, özet, analiz, podcast, kelime anlamı) anahtar gerektirir.

### Ortam değişkenleri
| Değişken | Açıklama |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API anahtarı (yalnızca sunucuda tutulur, tarayıcıya gönderilmez) |
| `PORT` | Sunucu portu (varsayılan 8787) |
| `LISAN_MODEL` | Model (varsayılan `claude-opus-5-5`) |

## Mimari

```
lisan/
├── server/            Express API (Node, TypeScript)
│   ├── ai.ts          Claude çağrıları: akışlı (SSE) görevler + yapılandırılmış JSON görevler
│   ├── prompts.ts     Görev başına sistem istemleri
│   └── books.ts       Project Gutenberg arama/indirme
└── src/               React + Vite arayüzü
    ├── components/    Öğren, Kütüphane/Okuyucu, Efsaneler, Özet, Analiz, Ayarlar, Oynatıcı
    ├── lib/           tts (anlatıcı), srs (aralıklı tekrar), pdf, speech, store (IndexedDB/localStorage)
    └── data/          diller, müfredat, katalog, başlangıç destesi
```

- **Claude API:** analiz görevi `web_search` + `web_fetch` sunucu araçlarını kullanır, kaynaklar arayüzde listelenir. Dersler, desteler, sınav, podcast senaryosu ve kelime anlamları yapılandırılmış çıktı (Zod şeması) ile üretilir. Bir istek güvenlik sınıflandırıcısına takılırsa sunucu tarafı yedek model (`fallbacks: "default"`) devreye girer.
- **Seslendirme:** tarayıcının Web Speech API'si; cihazdaki tüm sesler kullanılabilir. En doğal sonuç için Chrome'da “Google…”, Edge'de “…Online (Natural)”, Apple cihazlarda “Gelişmiş/Premium” sesler önerilir.
- **Veriler:** ilerleme, kartlar ve kütüphane yalnızca tarayıcıda (localStorage + IndexedDB) tutulur; Ayarlar'dan yedeklenip geri yüklenebilir.

## Telif notu
Uygulama yalnızca kamu malı (telifsiz) kitapların tam metnini indirir. Telifli kitaplar için özet ve analiz üretilir; kendi sahip olduğun PDF'leri yükleyip dinleyebilirsin.
