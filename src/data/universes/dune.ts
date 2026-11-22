// Dune evreni: Frank Herbert'in kitapları, Brian Herbert ve Kevin J. Anderson'ın devam/öncül kitapları, filmler, diziler, semboller, temalar, teoriler.
import { fandom, reddit, siteSearch, TR_CHANNELS, type UniverseData } from "./types";

export const DUNE: UniverseData = {
  id: "dune",
  title: "Dune Evreni",
  icon: "🏜️🪱",
  author: "Frank Herbert",
  analysisTitle: "Dune",
  intro:
    "Frank Herbert'in Dune serisi: Arrakis çölü, baharat, kum solucanları, Bene Gesserit ve Altın Yol. Herbert'in 6 romanı, oğlu Brian Herbert ile Kevin J. Anderson'ın devam ve öncül kitapları, Lynch ve Villeneuve filmleri, diziler, semboller, temalar ve teoriler.",
  copyrightNote: "Kitaplar telifli olduğundan tam metinleri uygulamada yok; buradaki metinler kısa tanıtımlardır.",
  cardNote: "Herbert'in 6 kitabı, öncül/devam kitapları, Villeneuve filmleri, Dune: Prophecy, teoriler",
  sections: [
    {
      id: "books",
      label: "📚 Frank Herbert'in 6 kitabı",
      kind: "books",
      groups: [
        {
          books: [
            { title: "Dune", tr: "Dune", year: "1965", note: "Atreides Hanesi'nin çöl gezegeni Arrakis'e gönderilmesi, Harkonnen ihaneti ve genç Paul'ün Fremenler arasında Muad'Dib'e dönüşmesi. Ekoloji, din ve siyasetin iç içe geçtiği klasik." },
            { title: "Dune Messiah", tr: "Dune Mesihi", year: "1969", note: "İmparator olmuş Paul'ün adına yürütülen cihadın bedeli ve ona karşı kurulan komplo. Herbert'in “karizmatik lidere güvenmeyin” uyarısının en açık hâli." },
            { title: "Children of Dune", tr: "Dune Çocukları", year: "1976", note: "Paul'ün ikiz çocukları Leto ve Ghanima; Arrakis'in yeşillenmesi ve Leto'nun insanlık için seçtiği ürkütücü yol." },
            { title: "God Emperor of Dune", tr: "Dune Tanrı İmparatoru", year: "1981", note: "Üç bin beş yüz yıl sonra, kum solucanına dönüşmekte olan Tanrı İmparator Leto II ve Altın Yol'un felsefesi." },
            { title: "Heretics of Dune", tr: "Dune Sapkınları", year: "1984", note: "Leto'nun ölümünden bin beş yüz yıl sonra; Bene Gesserit, Yüz Dansçıları ve Saçılma'dan dönen Onurlu Matreler." },
            { title: "Chapterhouse: Dune", tr: "Dune Rahibeler Meclisi", year: "1985", note: "Bene Gesserit'in hayatta kalma savaşı ve yarım kalan bir son: Herbert devam kitabını yazamadan 1986'da öldü." },
          ],
        },
      ],
    },
    {
      id: "expanded",
      label: "📜 Brian Herbert & K. J. Anderson",
      kind: "books",
      intro: "Frank Herbert'in notlarına dayandığı söylenen, ancak okurlar arasında kanonik değeri tartışılan devam ve öncül kitaplar.",
      groups: [
        {
          title: "Devam: serinin sonu",
          books: [
            { title: "Hunters of Dune", tr: "Dune Avcıları", year: "2006", note: "Chapterhouse'un bıraktığı yerden; Frank Herbert'in “Dune 7” notlarına dayandığı belirtilir." },
            { title: "Sandworms of Dune", tr: "Dune Kum Solucanları", year: "2007", note: "Serinin kapanışı; okurlar arasında en çok tartışılan sonlardan biri." },
          ],
        },
        {
          title: "Öncüller",
          books: [
            { title: "Prelude to Dune (House Atreides, Harkonnen, Corrino)", tr: "Dune'a Giriş üçlemesi", year: "1999–2001", note: "Dune'dan hemen önceki kuşak: Leto, Jessica, Duncan Idaho ve Harkonnenler." },
            { title: "Legends of Dune (The Butlerian Jihad…)", tr: "Dune Efsaneleri üçlemesi", year: "2002–2004", note: "Binlerce yıl önce düşünen makinelere karşı verilen Butlerian Cihadı." },
            { title: "Great Schools of Dune", tr: "Dune'un Büyük Okulları", year: "2012–2016", note: "Bene Gesserit, Mentatlar ve Lonca Navigatörlerinin kuruluşu; Dune: Prophecy dizisinin kaynağı." },
            { title: "Heroes of Dune / The Caladan Trilogy", tr: "Ara hikâyeler", year: "2008–2022", note: "Romanlar arasındaki boşlukları dolduran kitaplar." },
          ],
        },
      ],
    },
    {
      id: "adapt",
      label: "🎬 Filmler & diziler",
      kind: "books",
      groups: [
        {
          books: [
            { title: "Jodorowsky's Dune", tr: "Jodorowsky'nin Dune'u (belgesel)", year: "2013", note: "1970'lerde hiç çekilemeyen efsanevi uyarlama denemesinin belgeseli." },
            { title: "Dune (David Lynch)", tr: "Dune — David Lynch filmi", year: "1984", note: "İlk sinema uyarlaması; kendine özgü görselliğiyle kült, anlatımıyla tartışmalı." },
            { title: "Frank Herbert's Dune / Children of Dune", tr: "Sci-Fi Channel mini dizileri", year: "2000 / 2003", note: "İlk üç kitabı kapsayan televizyon uyarlamaları." },
            { title: "Dune: Part One (Denis Villeneuve)", tr: "Dune: Birinci Bölüm", year: "2021", note: "Kitabın ilk yarısı; Timothée Chalamet, Rebecca Ferguson." },
            { title: "Dune: Part Two (Denis Villeneuve)", tr: "Dune: İkinci Bölüm", year: "2024", note: "Kitabın ikinci yarısı; Chani'nin rolü ve sonun yorumu kitaptan belirgin biçimde ayrılır." },
            { title: "Dune: Part Three (Dune Messiah)", tr: "Dune: Üçüncü Bölüm", year: "2026", note: "Villeneuve'ün Dune Mesihi uyarlaması." },
            { title: "Dune: Prophecy", tr: "Dune: Kehanet (HBO)", year: "2024–", note: "Bene Gesserit'in kökenleri; Great Schools of Dune'a dayanır." },
          ],
        },
      ],
    },
    {
      id: "symbols",
      label: "🪱 Semboller",
      kind: "topics",
      items: [
        { id: "spice", title: "Baharat (melanj)", en: "spice melange symbolism oil allegory", text: "Uzay yolculuğunu, ömrü ve kehaneti mümkün kılan, yalnızca Arrakis'te bulunan madde. Sık sık petrolün ve kaynak bağımlılığının alegorisi olarak okunur: “Baharatı kontrol eden evreni kontrol eder.”" },
        { id: "worms", title: "Kum solucanları (Shai-Hulud)", en: "sandworms Shai-Hulud symbolism", text: "Çölün tanrısı, baharatın kaynağı ve ekosistemin kalbi. Fremenlerin onlara binmesi doğayla uyumun, solucanın Leto'ya dönüşmesi ise insanla gezegenin birleşmesinin simgesidir." },
        { id: "water", title: "Su", en: "water symbolism Fremen", text: "Arrakis'te en değerli şey: ölülerin suyu kabileye geri verilir, gözyaşı “ölüye su vermek”tir. Su, hem zenginliği hem toplumsal bağı temsil eder." },
        { id: "litany", title: "Korkuya karşı dua", en: "Litany Against Fear", text: "“Korkmamalıyım. Korku zihin öldürücüdür…” Bene Gesserit eğitiminin özü: duyguyu bastırmak değil, içinden geçmesine izin verip geride kalmak." },
        { id: "gom", title: "Gom jabbar ve kutu", en: "gom jabbar box test", text: "Paul'ün acıyla sınandığı ilk sahne: insanı hayvandan ayıranın içgüdüye karşı direnme gücü olduğu fikri." },
        { id: "eyes", title: "İbad'ın mavisi gözler", en: "blue within blue eyes spice", text: "Baharat bağımlılığının izi; Fremen kimliğinin ve gezegene ait olmanın işareti." },
        { id: "bull", title: "Boğa ve atalar", en: "bull head Atreides grandfather symbolism", text: "Paul'ün büyükbabasını öldüren boğanın başı: Atreides ailesinin trajik kahramanlık mirası ve Yunan tragedyası (Atreus soyu) göndermesi." },
      ],
    },
    {
      id: "themes",
      label: "🎭 Temalar",
      kind: "topics",
      items: [
        { id: "messiah", title: "Kurtarıcıya karşı uyarı", en: "Frank Herbert messiah warning charismatic leaders", text: "Herbert, Dune'u süper kahramanların insanlık için felaket olduğunu göstermek için yazdığını söyler. Paul'ün zaferi, milyarlarca insanın öldüğü bir cihada dönüşür." },
        { id: "ecology", title: "Ekoloji", en: "Dune ecology theme Liet Kynes", text: "Kitap modern ekoloji hareketinin ilham kaynaklarındandır: gezegen bilimcisi Liet-Kynes'in Arrakis'i yeşillendirme planı ve bunun öngörülemeyen sonuçları." },
        { id: "religion", title: "Din ve siyaset", en: "religion as political tool Missionaria Protectiva", text: "Bene Gesserit'in Missionaria Protectiva'sı yüzyıllar önce efsaneler ekerek Paul'ün yolunu hazırlar: dinin bir siyasi araç olarak kullanılması." },
        { id: "prescience", title: "Kehanet ve özgür irade", en: "prescience trap free will Dune", text: "Geleceği görmek bir tuzaktır: gördüğün gelecek seni ona doğru iter. Leto II'nin Altın Yol'u, insanlığı bu tuzaktan kurtarma girişimidir." },
        { id: "ai", title: "Düşünen makineler yasağı", en: "Butlerian Jihad thinking machines theme", text: "“İnsan zihnine benzeyen makine yapmayacaksın.” Butlerian Cihadı, insanın kendi zihnini geliştirmesini (Mentatlar, Bene Gesserit) zorunlu kılar." },
        { id: "colonial", title: "Sömürgecilik ve Fremenler", en: "Dune colonialism Fremen Arabic Islamic influences", text: "Fremen kültüründe Arap ve İslam etkileri, emperyal güçlerin yerli halkları kendi amaçları için kullanması ve “beyaz kurtarıcı” anlatısının eleştirisi." },
      ],
    },
    {
      id: "theories",
      label: "🔮 Teoriler & tartışmalar",
      kind: "topics",
      items: [
        { id: "paul-villain", title: "Paul kahraman mı, kötü adam mı?", en: "Is Paul Atreides a villain", status: "Tartışmalı", text: "Herbert'in niyetine göre Paul trajik bir anti-kahramandır; Villeneuve'ün filmleri bu yorumu daha açık hâle getirir. Okurlar yine de onun seçeneği olup olmadığını tartışır.", spoiler: true },
        { id: "golden-path", title: "Altın Yol haklı mıydı?", en: "Golden Path Leto II justified", status: "Tartışmalı", text: "Leto II'nin binlerce yıllık zorbalığı, insanlığın yok olmasını önlemek için zorunlu muydu?", spoiler: true },
        { id: "daniel-marty", title: "Daniel ve Marty kimdir?", en: "Daniel and Marty identity Chapterhouse ending", status: "Tartışmalı", text: "Chapterhouse'un sonunda beliren gizemli çift: Brian Herbert ve Anderson'ın devam kitapları bir açıklama verir, ancak birçok okur Frank Herbert'in niyetinin farklı olduğunu düşünür.", spoiler: true },
        { id: "canon", title: "Genişletilmiş evren kanonik mi?", en: "Brian Herbert Kevin J Anderson canon debate", status: "Tartışmalı", text: "Brian Herbert ve Kevin J. Anderson kitaplarının Frank Herbert'in notlarına ne kadar sadık olduğu, r/dune'un en eski tartışmalarındandır." },
        { id: "chani", title: "Filmlerde Chani'nin değişen rolü", en: "Chani Dune Part Two ending difference from book", status: "Uyarlama farkı", text: "Villeneuve, Chani'yi Paul'ün dönüşümüne karşı bir vicdan sesi yapar; kitapta ise Paul'e sadık kalır. Değişikliğin Messiah uyarlamasını nasıl etkileyeceği tartışılır.", spoiler: true },
        { id: "kh-earlier", title: "Kwisatz Haderach'ın bir kuşak erken gelişi", en: "Kwisatz Haderach a generation early Jessica son", status: "Kitapta açık", text: "Jessica'nın kız yerine erkek çocuk doğurması Bene Gesserit planını bir kuşak erkene alır; bunun bilerek mi yapıldığı ve sonuçları." },
      ],
    },
    {
      id: "interviews",
      label: "🎙 Yazar söyleşileri",
      kind: "topics",
      items: [
        { id: "dune-genesis", title: "“Dune Genesis” (1980)", en: "Frank Herbert Dune Genesis essay 1980", text: "Herbert'in Dune'un doğuşunu anlattığı deneme: Oregon kumullarında yaptığı bir dergi araştırmasıyla başlayan fikir ve süper kahraman uyarısı." },
        { id: "herbert-interviews", title: "Frank Herbert söyleşileri", en: "Frank Herbert interview superheroes disastrous", text: "Söyleşilerinde liderlere körü körüne güvenmenin tehlikesini, ekolojiyi ve dili (Arapça etkiler) anlatır." },
        { id: "villeneuve", title: "Denis Villeneuve söyleşileri", en: "Denis Villeneuve Dune interview Paul villain", text: "Villeneuve, Paul'ü bir kurtarıcı değil uyarı olarak gösterme niyetini ve kitaptan ayrıldığı noktaları anlatır." },
        { id: "brian", title: "Brian Herbert ve notlar", en: "Brian Herbert Frank Herbert notes Dune 7", text: "Brian Herbert, babasının bıraktığı notlar ve “Dune 7” taslağına dayanarak devam kitaplarını yazdığını söyler." },
      ],
    },
  ],
  wikis: [
    fandom("Dune Wiki (Fandom)", "dune.fandom.com"),
    reddit("dune"),
    reddit("printSF"),
    siteSearch("Dune Novels (resmî site)", "dunenovels.com"),
    siteSearch("Frank Herbert söyleşileri", "", '"Frank Herbert" interview'),
  ],
  channels: [...TR_CHANNELS, { name: "Quinn's Ideas", lang: "en" }, { name: "Alt Shift X", lang: "en" }, { name: "The Dune Pod", lang: "en" }],
  homepages: [
    { name: "Dune Wiki (Fandom)", url: "https://dune.fandom.com", note: "karakterler, terimler, kitap ve film ayrıntıları" },
    { name: "r/dune", url: "https://www.reddit.com/r/dune/", note: "kitap ve film tartışmaları" },
    { name: "Dune Novels", url: "https://dunenovels.com", note: "Herbert mirasının resmî sitesi" },
  ],
  hints: [
    "Frank Herbert's six Dune novels (Dune to Chapterhouse: Dune)",
    "the Brian Herbert and Kevin J. Anderson sequels and prequels (clearly marked as expanded universe, with the canon debate)",
    "Frank Herbert's essay 'Dune Genesis' and his interviews",
    "the films by David Lynch and Denis Villeneuve, the Sci-Fi Channel miniseries and HBO's Dune: Prophecy (clearly separating adaptation changes from the books)",
    "the Dune Fandom wiki and Reddit r/dune discussions",
    "YouTube analysis channels: Quinn's Ideas, Alt Shift X and Turkish channels Geek Teori, Karakare, Legendarium Türkiye, 40ip, Argümento, Umur Tezer — mention a specific video only if you actually found it, never invent titles",
    "mw:https://dune.fandom.com/api.php|https://dune.fandom.com/wiki/|Dune Wiki",
  ],
};
