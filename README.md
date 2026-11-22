# Lisan — dil öğren, kitap dinle, edebiyatı derinlemesine anla

Lisan; çok dilli bir dil öğrenme sistemi, sesli kitap/podcast okuyucu, PDF anlatıcı ve web destekli edebi analiz aracını tek uygulamada birleştirir. Arayüz Türkçedir, yapay zekâ özellikleri Claude API ile çalışır.

## Ücretsiz kullanım — API anahtarı gerekmez

Lisan üç kademeli çalışır ve hangisinin kullanılacağını Ayarlar → **Yapay zekâ kaynağı**'ndan seçersin:

| Kademe | Ücret | Neler çalışır |
|---|---|---|
| **Ücretsiz kaynaklar** (kurulumsuz) | 0 ₺ | İngilizce (Türkçe açıklamalı) **112 ünitenin tamamı** (60 CEFR + 52 kurs dersi): konu anlatımı, kalıplar, gerçek örnek cümleler, boşluk doldurma, anlam seçme, çeviri, kelime sıralama, gölgeleme · sıklık sıralı **kelime desteleri** · **seviye tespit sınavı** · dokunarak **kelime anlamı** · Wikipedia'dan **kitap özeti** ve **tema/sembol bölümleri** + Reddit, Fandom, Goodreads, LitCharts, yazar söyleşisi bağlantıları · kitap okuma, sesli dinleme, PDF, sesli komutlar |
| **Ollama** (bilgisayarında yerel model) | 0 ₺ | Yukarıdakilere ek olarak her şey, **tüm dillerde**: öğretmenle (sesli) sohbet, seviyeli hikâye, podcast'e dönüştürme, sayfayı anlatma, yorumlu özet ve Wikipedia kaynaklı analiz, akıllı asistan |
| **Claude API** | kullandıkça | En yüksek kalite; analizde canlı web araştırması (söyleşiler, Reddit, fandom) |

Ücretsiz içerik kaynakları ve lisansları: [`data/README.md`](data/README.md) — Tatoeba (126.000 gerçek İngilizce–Türkçe cümle çifti), OpenSubtitles sıklık listeleri (12 dil), Wikipedia, Project Gutenberg.

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

**Kurslar** (CEFR müfredatına ek, beceri odaklı):
| Kurs | Seviye | İçerik |
|---|---|---|
| ☕ Günlük Konuşma (Everyday English) | A2 → B1 | 15 ders: small talk, sipariş, plan yapma, telefon, şikâyet, duygular, vedalaşma… |
| 🎤 Konuşma Akıcılığı (Speaking Fluency) | A2 → C1 | 12 ders: düşünürken boşluk doldurma, takılmadan anlatma, vurgu/tonlama, bağlantılı konuşma, Türkler için zor sesler |
| 🗽 Native gibi konuş (Native English) | B2 → C2 | 15 ders: gonna/wanna, phrasal verb'ler, deyimler, güncel argo, Amerikan/İngiliz farkı, ironi, dizi dili, schwa ve aksan |
| 💼 İş Dili (Business English) | B1 → C1 | 10 ders: toplantı, e-posta, sunum, mülakat, müzakere |

**Eller serbest sesli sohbet:** Öğretmen sekmesinde mikrofonla konuşursun, öğretmen sesli yanıt verir ve tekrar dinlemeye geçer; ekrana dokunmadan sohbet edilir. Yeni modlar: Günlük konuşma, Native sohbet (deyim & argo), Konuşma akıcılığı koçu.

### 🤖 Lisan Asistan ve sesli komutlar
Sağ alttaki 🤖 asistan uygulamayı senin yerine kullanır: kitap açar ve sesli okur, kurs/ders başlatır, desteye kelime ekler, özet ve analiz başlatır, oynatıcıyı yönetir, ilerlemeni söyler ve ne çalışman gerektiğini önerir. Yazarak ya da konuşarak kullanılır.

- **🎙 Sesli komut** (düğme veya Ctrl+Shift+Boşluk): “duraklat”, “devam”, “sonraki”, “hızlandır”, “20 dakika sonra kapat”, “kartları aç”, “kütüphaneye git” gibi kısa komutlar **yapay zekâ olmadan, anında ve ücretsiz** çalışır.
- **Eller serbest:** Ayarlar'dan açılınca “Lisan, Suç ve Ceza'yı aç ve oku” diye seslenmen yeterli.
- **Ücretsiz yapay zekâ:** Asistan, bilgisayarında çalışan [Ollama](https://ollama.com) ile tamamen ücretsiz çalışabilir (API anahtarı gerekmez). Claude anahtarı varsa daha akıllı Claude kullanılabilir; Ayarlar'dan seçilir.

Ücretsiz asistan kurulumu:
```bash
# 1) https://ollama.com adresinden Ollama'yı kur
ollama pull qwen3:8b        # ≈5 GB; zayıf bilgisayarda: qwen3:4b (sonra .env'de OLLAMA_MODEL=qwen3:4b)
# 2) Lisan'ı aynı bilgisayarda çalıştır — asistan Ollama'yı kendiliğinden bulur
npm run dev
```

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

API anahtarı olmadan tamamen çalışır (yukarıdaki “Ücretsiz kullanım” tablosuna bak). Ücretsiz veriler depoyla birlikte gelir; güncellemek için `node scripts/build-data.mjs`.

Sesli komut ve konuşma tanıma için Chrome veya Edge önerilir (Firefox konuşma tanımayı desteklemez).

### Ortam değişkenleri
| Değişken | Açıklama |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API anahtarı (yalnızca sunucuda tutulur, tarayıcıya gönderilmez) |
| `PORT` | Sunucu portu (varsayılan 8787) |
| `LISAN_MODEL` | Model (varsayılan `claude-opus-5-5`) |
| `AGENT_MODEL` | Asistan modeli (varsayılan `LISAN_MODEL`; daha ucuz seçenek `claude-haiku-5-5`) |
| `OLLAMA_URL`, `OLLAMA_MODEL` | Ücretsiz yerel asistan (varsayılan `http://localhost:11434`, `qwen3:8b`) |

## Mimari

```
lisan/
├── server/            Express API (Node, TypeScript)
│   ├── ai.ts          Claude çağrıları: akışlı (SSE) görevler + yapılandırılmış JSON görevler
│   ├── agent.ts       Yardımcı ajan: araç tanımları, Claude ve Ollama sağlayıcıları
│   ├── free.ts        Ücretsiz motor: Tatoeba dersleri, desteler, seviye testi, sözlük, Wikipedia özet/analiz
│   ├── freeUnits.ts   112 ünitenin anahtar kelimeleri, kalıpları ve Türkçe anlatımı
│   ├── ollama.ts      Yerel model (akış + şemaya uygun JSON)
│   ├── prompts.ts     Görev başına sistem istemleri
│   └── books.ts       Project Gutenberg arama/indirme
├── data/              Ücretsiz veri (Tatoeba, sıklık listeleri, sözlük) — scripts/build-data.mjs
└── src/               React + Vite arayüzü
    ├── components/    Öğren, Kütüphane/Okuyucu, Efsaneler, Özet, Analiz, Ayarlar, Oynatıcı
    ├── lib/           tts (anlatıcı), srs (aralıklı tekrar), pdf, speech (konuşma tanıma), actions (asistan araçları + yerel sesli komutlar), store
    └── data/          diller, müfredat, kurslar, katalog, başlangıç destesi
```

- **Claude API:** analiz görevi `web_search` + `web_fetch` sunucu araçlarını kullanır, kaynaklar arayüzde listelenir. Dersler, desteler, sınav, podcast senaryosu ve kelime anlamları yapılandırılmış çıktı (Zod şeması) ile üretilir. Bir istek güvenlik sınıflandırıcısına takılırsa sunucu tarafı yedek model (`fallbacks: "default"`) devreye girer.
- **Asistan:** model bir tur yürütür, istediği araçları (gezinme, oynatıcı, kart ekleme, kitap açma…) tarayıcı çalıştırır ve sonucu geri gönderir; en fazla 8 adım. Claude'da ek olarak web araması vardır.
- **Seslendirme:** tarayıcının Web Speech API'si; cihazdaki tüm sesler kullanılabilir. En doğal sonuç için Chrome'da “Google…”, Edge'de “…Online (Natural)”, Apple cihazlarda “Gelişmiş/Premium” sesler önerilir.
- **Veriler:** ilerleme, kartlar ve kütüphane yalnızca tarayıcıda (localStorage + IndexedDB) tutulur; Ayarlar'dan yedeklenip geri yüklenebilir.

## Telif notu
Uygulama yalnızca kamu malı (telifsiz) kitapların tam metnini indirir. Telifli kitaplar için özet ve analiz üretilir; kendi sahip olduğun PDF'leri yükleyip dinleyebilirsin.
