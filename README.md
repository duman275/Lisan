# Lisan — dil öğren, kitap dinle, edebiyatı derinlemesine anla

Lisan; çok dilli bir dil öğrenme sistemi, sesli kitap/podcast okuyucu, PDF anlatıcı ve web destekli edebi analiz aracını tek uygulamada birleştirir. Arayüz Türkçedir, yapay zekâ özellikleri Claude API ile çalışır.

## 📱 Telefondan kullan

**https://duman275.github.io/Lisan/**

Telefona yükleme (iki yol):
- **Android uygulaması (APK):** **https://duman275.github.io/Lisan/Lisan.apk** — indir, dosyaya dokun, “Bu kaynağa izin ver” → Yükle. Play Protect uyarısında “Yine de yükle”. (APK her derlemede yeniden imzalandığından yeniden kurarken önce eskisini kaldır; içerik güncellemeleri ise internetten kendiliğinden gelir.)
- **Chrome'dan yükle:** siteyi Chrome uygulamasının **kendisinde** aç (başka bir uygulamanın içindeki pencerede yükleme çalışmaz) → ⋮ → “Uygulamayı yükle”.

**Telefonda yapay zekâ:** Ayarlar → “Telefonda yapay zekâ” → ücretsiz Google Gemini anahtarı (aistudio.google.com/apikey). Varsayılan model `gemini-3.5-flash`; model kapalı/yoğunsa sıradaki Gemini modeline otomatik geçer. Öğretmen (sesli sohbet dahil), podcast, hikâye, sayfa anlatma, asistan ve İngilizce dışındaki dillerde dersler bununla çalışır.

Telefondaki sürüm sunucusuzdur ve tamamen ücretsizdir: İngilizce dersler (112 ünite), kelime kartları, seviye testi, sözlük, Efsaneler'deki 📗 telifsiz kitapları okuma/dinleme, PDF yükleme, Wikipedia özet/analiz ve sesli komutlar çalışır. Öğretmenle sohbet, hikâye yazma ve podcast gibi dil modeli isteyen özellikler bilgisayarda (Ollama/Claude ile) çalışan sürümdedir.

Site, `main` dalına her gönderimde GitHub Actions ile otomatik derlenir (`.github/workflows/pages.yml`).

### 🔊 Sesler ve tam kitap dinleme
- **Nöral sesler (ücretsiz, cihazda):** Piper modelleri; Türkçe ♂ Fahrettin, Fettah, DFKI; İngilizce ♀ Amy, Kristin, Jenny, Alba… ♂ Ryan, Joe, Alan…; Almanca, Fransızca, Rusça ve diğerleri. İlk kullanımda bir kez indirilir, sonra internetsiz çalışır ve **ekran kapalıyken de kitabı baştan sona okur**.
- **Kadın / Erkek** seçimi okuyucuda ve Ayarlar'da; podcast'te sunucu A kadın, B erkek sesidir.
- **Türkçe tam kitaplar:** telif süresi dolmuş Türk klasikleri Vikikaynak'tan (Efsaneler → Türk Edebiyatı → “Türkçe tam metin”).

### 🎬 Video: altyazı, çeviri ve dublaj
Ayrı “Video” sekmesi. 2 GB'a kadar video (veya ses) telefonda saklanır (Origin Private File System).
- **Altyazı çıkarma:** video Gemini Files API'ye 16 MB'lık parçalarla yüklenir (48 saat sonra Gemini'den silinir), konuşmalar 15 dakikalık bölümlerle zaman damgalı altyazıya dökülür. Hazır .srt/.vtt de yüklenebilir.
- **Çeviri:** altyazılar 13 dilden birine çevrilir; video üstünde iki satır altyazı (ör. orijinal + Türkçe) dil öğrenmek için.
- **Dublaj:** seçilen dildeki altyazılar video oynarken kadın/erkek (nöral ya da telefon) sesleriyle seslendirilir; orijinal ses kısılır, uzun cümleler hızlandırılır.
- **Dışa aktarma:** her dil için SRT/VTT indirme; metne dokunarak videoda o ana gitme; kaldığın yeri hatırlama.

### 🌌 Evrenler: Buz ve Ateşin Şarkısı, Orta Dünya, Dune
Efsaneler sekmesinde her evren ayrı bir sayfadır; her konuda “Derin analiz (kaynaklı)”, wiki/fandom/Reddit bağlantıları ve YouTube kanalları (Geek Teori, Karakare, Legendarium Türkiye, 40ip, Argümento, Umur Tezer ve evrene özel İngilizce kanallar) bulunur.

| Evren | İçerik |
|---|---|
| 🐺🐉 Buz ve Ateşin Şarkısı | 5 kitap, Kış Rüzgârları bölümleri, **Buz ve Ateş Dünyası** (Üstat Yandel, Şafak Çağı, Uzun Gece, Valyria, Targaryen kralları, bölgeler, Essos), **Yedi Krallığın Şövalyesi** (Dunk ve Egg'in 3 novellası, ana seriyle bağlar, HBO dizisi), yan kitaplar, diziler, semboller, temalar, teoriler, söyleşiler |
| 💍🌋 Orta Dünya | **Hobbit** (1951 düzeltmesi, ejderha hastalığı, uyarlamalar), **Yüzüklerin Efendisi** ve Ekler, **Silmarillion** bölüm bölüm (Ainulindalë'den Akallabêth'e), Bitmemiş Öyküler, Húrin'in Çocukları ve diğerleri, Jackson filmleri, animasyonlar, Güç Yüzükleri, semboller, temalar, teoriler (Bombadil, kartallar, Balrog kanatları…), Tolkien'in mektupları |
| 🏜️🪱 Dune | Frank Herbert'in 6 kitabı, Brian Herbert & K. J. Anderson devam/öncülleri, Lynch ve Villeneuve filmleri, Dune: Prophecy, semboller (baharat, solucanlar, su), temalar (kurtarıcı uyarısı, ekoloji, Butlerian Cihadı), teoriler, Herbert söyleşileri |

Analizde Claude web'de arar; Gemini/Ollama ise Wikipedia ile evrenin wiki'sinden (AWOIAF, Tolkien Gateway, Dune Wiki, Fandom) sayfaları bağlam olarak alır.

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

Ayrıca: seviye tespit sınavı (18 soru), seviye başına 10 ünitelik müfredat (A1–C2 ve **Native** = ana dil seviyesi, toplam 70 ünite), günlük plan, XP, seri ve haftalık grafik.

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

### 🎨 Görünüm
Varsayılan “Buz ve Ateş” teması (koyu, altın vurgular, Cinzel başlıklar); Ayarlar → Görünüm'den klasik açık temaya dönülebilir. Uygulama simgesi: çapraz Valyria çeliği kılıçlar — Buz (Stark) ve Blackfyre (Targaryen) — kitaplardaki tariflere göre özgün çizim.

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
| `OLLAMA_API_KEY` | Ollama Cloud anahtarı (ollama.com → Settings → Keys). Verilirse kurulum gerekmez; adres `https://ollama.com`, model `gpt-oss:120b` olur. **Not:** Ollama Cloud API kredi/abonelik ister; kredi yoksa Lisan otomatik olarak ücretsiz motora geçer. |

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
├── android/           Android uygulaması (Trusted Web Activity) — APK GitHub Actions'ta derlenir
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
