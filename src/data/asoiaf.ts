// Buz ve Ateşin Şarkısı (A Song of Ice and Fire) evreni: kitaplar, yan eserler, uyarlamalar, semboller, temalar, teoriler ve topluluk kaynakları.
// Metinler bu uygulama için yazılmış kısa tanıtımlardır; ayrıntılı ve kaynaklı inceleme için “Derin analiz” kullanılır.

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

export const WIKIS = [
  { name: "A Wiki of Ice and Fire", url: (q: string) => `https://awoiaf.westeros.org/index.php?search=${encodeURIComponent(q)}` },
  { name: "Game of Thrones Fandom Wiki", url: (q: string) => `https://gameofthrones.fandom.com/wiki/Special:Search?query=${encodeURIComponent(q)}` },
  { name: "Reddit r/asoiaf", url: (q: string) => `https://www.reddit.com/r/asoiaf/search/?q=${encodeURIComponent(q)}` },
  { name: "So Spake Martin (yazar söyleşileri arşivi)", url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:westeros.org "So Spake Martin" ${q}`)}` },
  { name: "Not a Blog (G.R.R. Martin)", url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:georgerrmartin.com ${q}`)}` },
];

// Kullanıcının önerdiği Türkçe kanallar + bilinen İngilizce teori kanalları
export const CHANNELS = [
  { name: "Geek Teori", lang: "tr" },
  { name: "Karakare", lang: "tr" },
  { name: "Legendarium Türkiye", lang: "tr" },
  { name: "40ip", lang: "tr" },
  { name: "Argümento", lang: "tr" },
  { name: "Umur Tezer", lang: "tr" },
  { name: "Alt Shift X", lang: "en" },
  { name: "History of Westeros", lang: "en" },
  { name: "Preston Jacobs", lang: "en" },
];

export const ytSearch = (channel: string, topicTr: string, topicEn: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${channel} ${CHANNELS.find((c) => c.name === channel)?.lang === "tr" ? topicTr : topicEn}`)}`;

export const INTERVIEW_TOPICS: UTopic[] = [
  { id: "int-gardener", title: "Mimar ve bahçıvan", en: "George R R Martin architect gardener interview", text: "Martin kendini planı önceden çizen bir “mimar” değil, hikâyesini büyürken keşfeden bir “bahçıvan” olarak tanımlar; bu, kitaplar arasındaki uzun aralıkların ve dallanan yapının bir açıklaması olarak sık anılır." },
  { id: "int-tolkien", title: "Tolkien ve tarihsel ilhamlar", en: "George R R Martin Tolkien War of the Roses interview", text: "Söyleşilerinde Tolkien'e duyduğu hayranlığı ve Güller Savaşı gibi gerçek tarihsel olaylardan aldığı ilhamı anlatır." },
  { id: "int-winds", title: "Kış Rüzgârları ne zaman?", en: "George R R Martin Winds of Winter update", text: "Yazarın blogunda ve söyleşilerinde kitabın ilerleyişi hakkında verdiği güncellemeler." },
  { id: "int-show", title: "Dizi ile kitapların farkı", en: "George R R Martin books vs show ending interview", text: "Martin, kitapların sonunun diziden farklı ayrıntılar ve karakterler içereceğini söylemiştir." },
];
