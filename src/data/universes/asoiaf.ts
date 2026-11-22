// Buz ve Ateşin Şarkısı (A Song of Ice and Fire) evreni: kitaplar, yan eserler, uyarlamalar, semboller, temalar, teoriler ve topluluk kaynakları.
// Metinler bu uygulama için yazılmış kısa tanıtımlardır; ayrıntılı ve kaynaklı inceleme için “Derin analiz” kullanılır.

import { reddit, fandom, siteSearch, TR_CHANNELS, type UBook, type UniverseData, type UTopic } from "./types";

export const AUTHOR = "George R. R. Martin";

export const MAIN_BOOKS: UBook[] = [
  { title: "A Game of Thrones", tr: "Taht Oyunları", year: "1996", note: "Stark ailesinin Kral Eli olarak başkente çekilmesiyle başlayan taht kavgası; Sur'un ötesinde uyanan tehdit ve denizin ötesinde Daenerys'in yükselişi." },
  { title: "A Clash of Kings", tr: "Kralların Çarpışması", year: "1998", note: "Beş Kral Savaşı: tahta aynı anda birden çok hak iddiası, Karasu Savaşı ve Kuzey'in kendi yolunu seçmesi." },
  { title: "A Storm of Swords", tr: "Kılıçların Fırtınası", year: "2000", note: "Serinin en çok övülen cildi: savaşın sonuçları, sarsıcı ihanetler ve Sur'daki büyük savunma." },
  { title: "A Feast for Crows", tr: "Kargaların Ziyafeti", year: "2005", note: "Savaş sonrası yıkım; güney karakterlerine (Kral Toprakları, Dorne, Demir Adalar) odaklanır. Ejderhaların Dansı ile aynı zaman diliminde geçer." },
  { title: "A Dance with Dragons", tr: "Ejderhaların Dansı", year: "2011", note: "Kuzey, Sur ve Meereen'deki karakterlerin hikâyesi; Kargaların Ziyafeti'yle paralel başlar, sonra onu geçer." },
  { title: "The Winds of Winter", tr: "Kış Rüzgârları", year: "yayınlanmadı", note: "Altıncı kitap; yazar yazmaya devam ettiğini söylüyor. Bazı örnek bölümler yayımlandı ya da etkinliklerde okundu (aşağıda)." },
  { title: "A Dream of Spring", tr: "Bahar Düşü", year: "planlanan", note: "Serinin planlanan yedinci ve son kitabı." },
];

export const TWOW_CHAPTERS: UTopic[] = [
  { id: "twow-theon", title: "Theon I", en: "Winds of Winter Theon I sample chapter", text: "Stannis'in ordusunun Kışyarı'na yürüyüşü sırasında, esir Theon'un bakış açısından. Ejderhaların Dansı'nın bazı baskılarına ek olarak yayımlandı.", spoiler: true },
  { id: "twow-arianne", title: "Arianne I ve II", en: "Winds of Winter Arianne sample chapter", text: "Dorne prensesi Arianne'nin, Genç Griff'in iddiasını araştırmak için yolculuğu. Yazarın sitesinde yayımlandı.", spoiler: true },
  { id: "twow-mercy", title: "Mercy (Arya)", en: "Winds of Winter Mercy chapter", text: "Braavos'ta, “Mercy” adını kullanan Arya'nın bir tiyatro topluluğundaki günleri.", spoiler: true },
  { id: "twow-alayne", title: "Alayne I (Sansa)", en: "Winds of Winter Alayne chapter", text: "Kartal Yuvası'nda Alayne kimliğiyle yaşayan Sansa ve Serçeparmak'ın planları.", spoiler: true },
  { id: "twow-barristan", title: "Barristan I", en: "Winds of Winter Barristan chapter", text: "Meereen dışındaki büyük savaşın arifesi.", spoiler: true },
  { id: "twow-tyrion", title: "Tyrion II", en: "Winds of Winter Tyrion chapter", text: "Meereen kuşatmasında İkinci Oğullar'la birlikte Tyrion.", spoiler: true },
  { id: "twow-victarion", title: "Victarion I", en: "Winds of Winter Victarion chapter", text: "Demir Filo'nun Meereen'e saldırısı ve Victarion'un ejderha borusu.", spoiler: true },
  { id: "twow-aeron", title: "The Forsaken (Aeron)", en: "Winds of Winter The Forsaken Aeron chapter", text: "Euron'un esiri Aeron Islakkafa'nın karanlık bölümü.", spoiler: true },
];

export const SIDE_BOOKS: UBook[] = [
  { title: "A Knight of the Seven Kingdoms", tr: "Yedi Krallığın Şövalyesi", year: "2015", note: "Dunk ve Egg novellalarının (The Hedge Knight 1998, The Sworn Sword 2003, The Mystery Knight 2010) toplu baskısı; ana hikâyeden yaklaşık 90 yıl önce." },
  { title: "The World of Ice & Fire", tr: "Buz ve Ateş Dünyası", year: "2014", note: "Westeros'un resimli tarihi; Elio M. García Jr. ve Linda Antonsson ile birlikte." },
  { title: "Fire & Blood", tr: "Ateş ve Kan", year: "2018", note: "Targaryen hanedanının tarihi (I. cilt); House of the Dragon dizisinin kaynağı." },
  { title: "The Princess and the Queen", tr: "Prenses ve Kraliçe", year: "2013", note: "Ejderhaların Dansı iç savaşının kısa anlatımı (Dangerous Women antolojisi)." },
  { title: "The Rogue Prince", tr: "Haydut Prens", year: "2014", note: "Daemon Targaryen'in gençliği (Rogues antolojisi)." },
  { title: "The Sons of the Dragon", tr: "Ejderhanın Oğulları", year: "2017", note: "Aenys ve Maegor dönemleri (The Book of Swords antolojisi)." },
  { title: "The Rise of the Dragon", tr: "Ejderhanın Yükselişi", year: "2022", note: "Targaryen tarihinin resimli özeti." },
];

export const ADAPTATIONS: UBook[] = [
  { title: "Game of Thrones", tr: "Game of Thrones (HBO)", year: "2011–2019", note: "8 sezon. İlk sezonlar kitaplara yakındır; 6. sezondan itibaren yayımlanmış kitapların ötesine geçer. Dizi ile kitaplar arasındaki farklar teori tartışmalarının önemli kaynağıdır." },
  { title: "House of the Dragon", tr: "House of the Dragon (HBO)", year: "2022–", note: "Ateş ve Kan'daki Ejderhaların Dansı iç savaşını anlatır." },
  { title: "A Knight of the Seven Kingdoms", tr: "A Knight of the Seven Kingdoms (HBO)", year: "2026", note: "Dunk ve Egg hikâyelerinin dizi uyarlaması." },
];

export const SYMBOLS: UTopic[] = [
  { id: "wolves", title: "Kurtlar (Stark'lar)", en: "direwolves symbolism", text: "Stark çocuklarının bulduğu kurt yavruları, her çocuğun kaderinin aynası gibidir: kurtların başına gelenler sahiplerinin yolunu önceden haber verir. Sürü teması — “Kar yağıp ak rüzgârlar estiğinde yalnız kurt ölür ama sürü yaşar” — dağılan ailenin trajedisini anlatır." },
  { id: "dragons", title: "Ejderhalar", en: "dragons symbolism", text: "Büyünün dünyaya dönüşünü, yıkıcı gücü ve Targaryen mirasını temsil eder. Ejderha ateşi hem kurtuluş hem felaket aracıdır; seri, kitle imha gücünün ahlaki bedelini sorgular." },
  { id: "weirwood", title: "Weirwood ağaçları ve Eski Tanrılar", en: "weirwood trees old gods", text: "Beyaz gövdeli, kırmızı yapraklı, yüzü oyulmuş ağaçlar; hafızayı, doğayı ve geçmişi gören “yeşil görücüleri” simgeler. Bran'in hikâyesi bu ağlar üzerinden zamanın ve belleğin doğasını tartışır." },
  { id: "ice-fire", title: "Buz ve Ateş", en: "ice and fire meaning", text: "Seri adını bu ikilikten alır: Ötekiler ve kış (buz) ile ejderhalar ve R'hllor (ateş). Birçok okuyucu bu iki gücün çatışmasından çok dengesinin hikâyenin özü olduğunu düşünür.", spoiler: true },
  { id: "wall", title: "Sur", en: "the Wall symbolism", text: "Medeniyetle “öteki” arasındaki sınır; unutulmuş tehditleri ve sınırların ötesindekilere duyulan önyargıyı simgeler. Gece Nöbeti'nin yeminli kardeşliği, onurla terk edilmişliğin bir arada olduğu bir yerdir." },
  { id: "throne", title: "Demir Taht", en: "Iron Throne symbolism", text: "Fethedilenlerin kılıçlarından dövülmüş, oturanı yaralayan bir taht: iktidarın asla rahat olmadığını ve şiddetten doğduğunu söyler." },
  { id: "crows", title: "Kargalar ve Üç Gözlü Kuzgun", en: "three-eyed crow ravens symbolism", text: "Gece Nöbeti'ne “kargalar” denir; kuzgunlar haber, bilgi ve kehanet taşır. Üç gözlü karga/kuzgun Bran'in rehberidir; kimliği okuyucu tartışmalarının konusudur." },
  { id: "mockingbird", title: "Alaycı kuş (Serçeparmak)", en: "Littlefinger mockingbird", text: "Petyr Baelish'in seçtiği arma: başkalarının sesini taklit eden kuş, manipülasyonu ve kaosu bir “merdiven” olarak gören politikacıyı anlatır." },
  { id: "roses", title: "Mavi kış gülleri", en: "blue winter roses Lyanna", text: "Lyanna Stark'la ilişkilendirilen mavi güller; aşkı, sırrı ve Jon'un kökenine dair ipuçlarını simgeler.", spoiler: true },
  { id: "winter", title: "“Kış Geliyor” ve düzensiz mevsimler", en: "Winter is Coming seasons", text: "Yıllarca süren yazlar ve kışlar istikrarsızlığı ve hazırlıksızlığı simgeler. Stark sözü, rahatlık dönemlerinde bile tehlikeye karşı uyanık kalmayı öğütler." },
  { id: "faces", title: "Yüzsüz Adamlar ve kimlik", en: "Faceless Men identity", text: "Braavos'taki Siyah-Beyaz Ev; kimliğini silmek ile kim olduğunu hatırlamak arasında kalan Arya'nın hikâyesini çerçeveler." },
  { id: "prophecy", title: "Kehanetler", en: "prophecies ASOIAF", text: "Azor Ahai, Vaat Edilen Prens, valonqar… Seride kehanetler sık sık yanlış okunur; karakterlerin kehanete inanarak yaptıkları seçimler kehaneti gerçekleştirir ya da çarpıtır." },
];

export const THEMES: UTopic[] = [
  { id: "power", title: "İktidar ve meşruiyet", en: "power legitimacy theme", text: "Kim yönetmeye layıktır: kan bağı mı, güç mü, halkın rızası mı? Varys'ın “güç nerede bulunur” bilmecesi temanın özetidir." },
  { id: "honor", title: "Onur ve pragmatizm", en: "honor pragmatism Ned Stark", text: "Ned Stark'ın onuru ile Tywin ve Serçeparmak'ın pragmatizmi çatışır; seri iki tavrın da bedelini gösterir." },
  { id: "broken", title: "Piçler, sakatlar ve kırık şeyler", en: "cripples bastards and broken things", text: "Tyrion'un sözü: toplumun dışladıkları (Jon, Tyrion, Bran, Brienne, Sam) hikâyenin kalbindedir." },
  { id: "war", title: "Savaşın bedeli", en: "cost of war Septon Meribald broken men", text: "Kahramanlık anlatısının tersine seri, savaşı köylülerin, “kırık adamların” gözünden de anlatır." },
  { id: "pov", title: "Bakış açısı ve güvenilmez anlatı", en: "POV unreliable narrator", text: "Her bölüm bir karakterin gözünden anlatılır; okur yalnızca onun bildiğini ve inandığını görür. Teorilerin çoğu bu boşluklardan doğar." },
  { id: "faith", title: "Din ve inanç", en: "religion faith ASOIAF", text: "Eski Tanrılar, Yedi, R'hllor, Boğulmuş Tanrı ve Çok Yüzlü Tanrı: inancın hem teselli hem fanatizm kaynağı olabileceği gösterilir." },
  { id: "women", title: "Kadınlar ve güç", en: "women and power ASOIAF", text: "Cersei, Daenerys, Catelyn, Sansa, Arya, Brienne ve Asha, ataerkil bir dünyada farklı güç stratejilerini temsil eder." },
];

export const THEORIES: UTopic[] = [
  { id: "rlj", title: "R+L=J", en: "R+L=J theory", status: "Dizide doğrulandı", text: "Jon Snow'un annesinin Lyanna Stark, babasının Rhaegar Targaryen olduğu teorisi. Kitaplarda ipuçlarıyla işlenir; dizide açıkça gösterildi.", spoiler: true },
  { id: "azor", title: "Azor Ahai / Vaat Edilen Prens", en: "Azor Ahai prince that was promised theory", status: "Açık", text: "Kehanetteki kahraman kim? Jon, Daenerys, Stannis ve başkaları için öne sürülen kanıtlar." },
  { id: "gnc", title: "Büyük Kuzey Komplosu", en: "Grand Northern Conspiracy", status: "Açık", text: "Kuzey lordlarının Boltonlara boyun eğiyormuş gibi görünürken Starkları geri getirmek için gizlice birlikte çalıştığı teorisi.", spoiler: true },
  { id: "griff", title: "Genç Griff kimdir?", en: "Young Griff Aegon Blackfyre theory", status: "Açık", text: "Aegon Targaryen olduğunu iddia eden gencin gerçek kimliği: gerçek Aegon mu, bir Blackfyre mı?", spoiler: true },
  { id: "cleganebowl", title: "Cleganebowl", en: "Cleganebowl theory", status: "Dizide gerçekleşti, kitapta açık", text: "Sandor “Tazı” ile Gregor “Dağ” Clegane kardeşlerin son düellosu beklentisi.", spoiler: true },
  { id: "valonqar", title: "Valonqar kehaneti", en: "valonqar prophecy Cersei", status: "Açık", text: "Cersei'yi “küçük kardeşin” öldüreceği kehaneti: Tyrion mı, Jaime mi, yoksa başka biri mi?", spoiler: true },
  { id: "stoneheart", title: "Leydi Taşkalp", en: "Lady Stoneheart", status: "Kitapta var, dizide yok", text: "Kitaplarda önemli olan ama diziye alınmayan bir karakter dönüşümü ve intikam teması.", spoiler: true },
  { id: "bloodraven", title: "Kuzgun, Bran ve zaman", en: "Bloodraven Bran time loop theory", status: "Tartışmalı", text: "Üç gözlü kuzgunun kimliği ve Bran'in geçmişe etki edip edemeyeceği üzerine teoriler (ör. “Bran the Builder”).", spoiler: true },
  { id: "tyrion-t", title: "Tyrion bir Targaryen mi?", en: "Tyrion Targaryen theory A+J=T", status: "Tartışmalı", text: "Tyrion'un babasının Aerys olabileceğine dair ipuçları ve karşı argümanlar." },
  { id: "others", title: "Ötekiler ne istiyor?", en: "The Others motivation theory", status: "Açık", text: "Kitaplardaki Ötekiler dizideki Ak Gezenler'den farklı ve daha gizemlidir; amaçları ve İlk İnsanlar/Orman Çocukları'yla ilişkileri." },
  { id: "euron", title: "Euron'un planı", en: "Euron Greyjoy plan theory Winds of Winter", status: "Açık", text: "Euron'un ejderha borusu, büyü ve tanrısallık hevesleri; Kış Rüzgârları'nda büyük kötü olacağı düşünülür.", spoiler: true },
];

export const INTERVIEW_TOPICS: UTopic[] = [
  { id: "int-gardener", title: "Mimar ve bahçıvan", en: "George R R Martin architect gardener interview", text: "Martin kendini planı önceden çizen bir “mimar” değil, hikâyesini büyürken keşfeden bir “bahçıvan” olarak tanımlar; bu, kitaplar arasındaki uzun aralıkların ve dallanan yapının bir açıklaması olarak sık anılır." },
  { id: "int-tolkien", title: "Tolkien ve tarihsel ilhamlar", en: "George R R Martin Tolkien War of the Roses interview", text: "Söyleşilerinde Tolkien'e duyduğu hayranlığı ve Güller Savaşı gibi gerçek tarihsel olaylardan aldığı ilhamı anlatır." },
  { id: "int-winds", title: "Kış Rüzgârları ne zaman?", en: "George R R Martin Winds of Winter update", text: "Yazarın blogunda ve söyleşilerinde kitabın ilerleyişi hakkında verdiği güncellemeler." },
  { id: "int-show", title: "Dizi ile kitapların farkı", en: "George R R Martin books vs show ending interview", text: "Martin, kitapların sonunun diziden farklı ayrıntılar ve karakterler içereceğini söylemiştir." },
];

// ---------- Buz ve Ateş Dünyası (The World of Ice & Fire, 2014) ----------
export const TWOIAF: UTopic[] = [
  { id: "twoiaf-book", title: "Kitap: Buz ve Ateş Dünyası", en: "The World of Ice and Fire book Maester Yandel", text: "George R. R. Martin, Elio M. García Jr. ve Linda Antonsson'un 2014'te yayımladığı resimli tarih kitabı. Kitap, evrenin içinden bir yazar olan Üstat Yandel'in Kral Tommen'e sunduğu bir tarih çalışması olarak kurgulanmıştır." },
  { id: "twoiaf-yandel", title: "Güvenilmez tarihçi: Üstat Yandel", en: "Maester Yandel unreliable narrator", text: "Yandel, Lannister ve Baratheon hükümdarlığı altında yazdığı için bazı olayları yumuşatır, bazı söylentileri ise “kesin olmayan” diye aktarır. Okurlar, satır aralarındaki bu taraflılıktan pek çok teori çıkarır." },
  { id: "twoiaf-dawn", title: "Antik Tarih: Şafak Çağı ve İlk İnsanlar", en: "Dawn Age First Men Children of the Forest", text: "Orman Çocukları'nın Westeros'taki ilk çağı, İlk İnsanlar'ın Essos'tan gelişi, iki halk arasındaki savaşlar ve sonunda İsle of Faces'te yapılan Antlaşma." },
  { id: "twoiaf-night", title: "Uzun Gece ve Sur'un inşası", en: "Long Night Night's King Wall Brandon the Builder", text: "Bir nesil süren kış, Ötekiler'in gelişi, Şafak Savaşı ve efsaneye göre İnşaatçı Bran'in Sur'u yükseltmesi. Gece Kralı efsanesi de bu döneme bağlanır.", spoiler: false },
  { id: "twoiaf-andals", title: "Andalların gelişi ve Yedi'ye inanç", en: "Andal invasion Faith of the Seven", text: "Andalların Westeros'a gelişi, demir silahlar, Yedi inancının yayılması ve İlk İnsanlar'ın krallıklarının çoğunun düşüşü (Kuzey hariç)." },
  { id: "twoiaf-valyria", title: "Valyria'nın yükselişi ve Felaket", en: "Valyrian Freehold Doom of Valyria", text: "Ejderha efendilerinin Özgür Valyria'sı, Ghis ile savaşlar, Valyria çeliği ve büyüsü; sonra adını bile bilmediğimiz bir felaketle tek günde yok oluşu. Felaket'in nedeni hâlâ büyük bir gizemdir." },
  { id: "twoiaf-conquest", title: "Aegon'un Fethi", en: "Aegon's Conquest Field of Fire Harrenhal", text: "Fatih Aegon ve kız kardeşleri Visenya ile Rhaenys'in üç ejderhayla Yedi Krallık'ı birleştirmesi: Harrenhal'in yakılışı, Ateş Tarlası ve Dorne'un direnişi." },
  { id: "twoiaf-kings", title: "Targaryen kralları", en: "Targaryen kings history", text: "Aegon I'den Deli Kral Aerys II'ye: Maegor'un zulmü, Jaehaerys'in uzun barışı, Ejderhaların Dansı, ejderhaların sonu, Blackfyre isyanları ve Summerhall trajedisi." },
  { id: "twoiaf-regions", title: "Yedi Krallık bölge bölge", en: "Seven Kingdoms regions North Vale Riverlands Iron Islands Westerlands Reach Stormlands Dorne", text: "Kuzey, Vadi, Nehir Toprakları, Demir Adalar, Batı Toprakları, Erişim, Fırtına Toprakları ve Dorne: her bölgenin kuruluş efsanesi, büyük haneleri, gelenekleri ve kaleleri." },
  { id: "twoiaf-beyond", title: "Denizlerin ötesi: Essos, Asshai, Sothoryos", en: "Free Cities Essos Asshai Sothoryos Ulthos", text: "Özgür Şehirler, Dothraki Denizi, Yi Ti, Gölge kıyısındaki Asshai ve keşfedilmemiş Sothoryos ile Ulthos: ana hikâyenin dışında kalan dünyanın ipuçları." },
];

// ---------- Yedi Krallığın Şövalyesi (Dunk ve Egg) ----------
export const AKOTSK: UTopic[] = [
  { id: "dunk-egg", title: "Dunk ve Egg kimdir?", en: "Dunk and Egg Ser Duncan the Tall Aegon V", text: "Ana hikâyeden yaklaşık 90 yıl önce, gezgin bir şövalye olan iri yarı Ser Duncan (Dunk) ile tıraşlı kafalı yaveri Egg'in maceraları. Egg'in gerçek kimliği ilk novellada ortaya çıkar.", spoiler: false },
  { id: "hedge-knight", title: "The Hedge Knight — Gezgin Şövalye (1998)", en: "The Hedge Knight Ashford tourney trial of seven", text: "Ustası Ser Arlan'ın ölümünden sonra kendini şövalye ilan eden Dunk, Ashford turnuvasına katılır; bir Targaryen prensine karşı çıkınca “yedilerin düellosu”na sürüklenir. Bedeli ağır olacaktır.", spoiler: true },
  { id: "sworn-sword", title: "The Sworn Sword — Yeminli Kılıç (2003)", en: "The Sworn Sword Standfast Red Widow drought", text: "Kuraklık zamanında yaşlı Ser Eustace Osgrey'in hizmetindeki Dunk ve Egg, su yüzünden “Kızıl Dul” Leydi Rohanne Webber ile çıkan anlaşmazlığın ortasında kalır. Blackfyre İsyanı'nın gölgesi hâlâ taze." },
  { id: "mystery-knight", title: "The Mystery Knight — Gizemli Şövalye (2010)", en: "The Mystery Knight Whitewalls Blackfyre plot Bloodraven", text: "Beyazduvarlar'daki düğün turnuvası, ödül olarak bir ejderha yumurtası ve arka planda yeni bir Blackfyre komplosu. Kral'ın Eli Bloodraven'ın gizli ağı da sahnededir.", spoiler: true },
  { id: "akotsk-links", title: "Ana seriyle bağlantılar", en: "Dunk and Egg connections Summerhall Maester Aemon Brienne", text: "Egg'in kardeşi Aemon, Gece Nöbeti'nin yaşlı üstadıdır; Summerhall felaketi ve Ser Duncan'ın kaderi ana seride anılır. Okurlar ayrıca Brienne'in Dunk'ın soyundan gelebileceğini düşünür (teori).", spoiler: true },
  { id: "akotsk-future", title: "Gelecek novellalar", en: "Dunk and Egg future novellas She-Wolves of Winterfell", text: "Martin, Dunk ve Egg'in hikâyesini Summerhall'a kadar götürecek yeni novellalar planladığını söylemiştir; çalışma başlıklarından biri “The She-Wolves of Winterfell”dir." },
  { id: "akotsk-show", title: "HBO dizisi (2026)", en: "A Knight of the Seven Kingdoms HBO series 2026", text: "İlk novella The Hedge Knight'tan uyarlanan dizi 2026'da yayımlandı; Dunk'ı Peter Claffey, Egg'i Dexter Sol Ansell canlandırır. Ana seriden daha küçük ölçekli, daha sıcak bir ton taşır." },
  { id: "akotsk-themes", title: "Temalar: gerçek şövalyelik", en: "Dunk and Egg themes true knighthood", text: "Şövalyeliğin unvanla değil davranışla kazanıldığı fikri; soylular ile sıradan insanlar arasındaki uçurum ve gücün sorumluluğu. Egg'in gelecekteki kral oluşu bu dersleri anlamlı kılar." },
];

export const ASOIAF: UniverseData = {
  id: "asoiaf",
  title: "Buz ve Ateşin Şarkısı Evreni",
  icon: "🐺🐉",
  author: AUTHOR,
  analysisTitle: "A Song of Ice and Fire",
  intro:
    "George R. R. Martin'in A Song of Ice and Fire serisi: yayınlanan 5 kitap, Kış Rüzgârları'nın açıklanan bölümleri, Buz ve Ateş Dünyası, Yedi Krallığın Şövalyesi, Ateş ve Kan, diziler, yazar söyleşileri, semboller, temalar ve teoriler.",
  copyrightNote: "Kitaplar telifli olduğundan tam metinleri uygulamada yok; buradaki metinler kısa tanıtımlardır.",
  cardNote: "5 kitap, Kış Rüzgârları, Buz ve Ateş Dünyası, Dunk ve Egg, diziler, teoriler, semboller",
  sections: [
    { id: "books", label: "📚 5 kitap", kind: "books", groups: [{ books: MAIN_BOOKS }] },
    { id: "twow", label: "❄️ Kış Rüzgârları", kind: "topics", intro: "The Winds of Winter (Kış Rüzgârları) henüz yayınlanmadı. Aşağıdakiler yazarın sitesinde yayımlanan ya da etkinliklerde okunan örnek bölümlerdir (ayrıntılar için A Wiki of Ice and Fire'daki “The Winds of Winter” sayfasına bak).", items: TWOW_CHAPTERS },
    { id: "twoiaf", label: "🌍 Buz ve Ateş Dünyası", kind: "topics", intro: "The World of Ice & Fire (2014): Westeros ve ötesinin resimli tarihi.", items: TWOIAF },
    { id: "akotsk", label: "🛡️ Yedi Krallığın Şövalyesi", kind: "topics", intro: "A Knight of the Seven Kingdoms: Dunk ve Egg novellaları ve HBO dizisi.", items: AKOTSK },
    { id: "side", label: "📜 Yan kitaplar & diziler", kind: "books", groups: [{ title: "Yan kitaplar", books: SIDE_BOOKS }, { title: "Diziler", books: ADAPTATIONS }] },
    { id: "symbols", label: "🐺 Semboller", kind: "topics", items: SYMBOLS },
    { id: "themes", label: "🎭 Temalar", kind: "topics", items: THEMES },
    { id: "theories", label: "🔮 Teoriler", kind: "topics", items: THEORIES },
    { id: "interviews", label: "🎙 Yazar söyleşileri", kind: "topics", items: INTERVIEW_TOPICS },
  ],
  wikis: [
    { name: "A Wiki of Ice and Fire", url: (q) => `https://awoiaf.westeros.org/index.php?search=${encodeURIComponent(q)}` },
    fandom("Game of Thrones Fandom Wiki", "gameofthrones.fandom.com"),
    reddit("asoiaf"),
    reddit("HouseOfTheDragon"),
    siteSearch("So Spake Martin (yazar söyleşileri)", "westeros.org", '"So Spake Martin"'),
    siteSearch("Not a Blog (G.R.R. Martin)", "georgerrmartin.com"),
  ],
  channels: [...TR_CHANNELS, { name: "Alt Shift X", lang: "en" }, { name: "History of Westeros", lang: "en" }, { name: "Preston Jacobs", lang: "en" }],
  homepages: [
    { name: "A Wiki of Ice and Fire", url: "https://awoiaf.westeros.org", note: "kitap odaklı, bölüm bölüm kaynaklı ansiklopedi" },
    { name: "Game of Thrones Fandom Wiki", url: "https://gameofthrones.fandom.com", note: "dizi ve kitaplar" },
    { name: "r/asoiaf", url: "https://www.reddit.com/r/asoiaf/", note: "teoriler ve tartışmalar" },
    { name: "So Spake Martin", url: "https://www.westeros.org/Citadel/SSM/", note: "yazarın söyleşi ve yanıtları arşivi" },
    { name: "Not a Blog", url: "https://georgerrmartin.com/notablog/", note: "G.R.R. Martin'in kendi blogu" },
  ],
  hints: [
    "the five published novels and the released The Winds of Winter sample chapters",
    "Fire & Blood, The World of Ice & Fire (Maester Yandel's in-world history), the Dunk and Egg novellas (A Knight of the Seven Kingdoms)",
    "George R. R. Martin's interviews (So Spake Martin archive at westeros.org, his Not a Blog)",
    "A Wiki of Ice and Fire (awoiaf.westeros.org) and the Game of Thrones Fandom wiki",
    "Reddit r/asoiaf discussions and fan theories",
    "the HBO series Game of Thrones, House of the Dragon and A Knight of the Seven Kingdoms (clearly separating show-only events from the books)",
    "YouTube analysis channels: Alt Shift X, History of Westeros, Preston Jacobs, and Turkish channels Geek Teori, Karakare, Legendarium Türkiye, 40ip, Argümento, Umur Tezer — mention a specific video only if you actually found it, never invent titles",
    "mw:https://awoiaf.westeros.org/api.php|https://awoiaf.westeros.org/index.php/|AWOIAF",
    "mw:https://gameofthrones.fandom.com/api.php|https://gameofthrones.fandom.com/wiki/|GoT Fandom",
  ],
};
