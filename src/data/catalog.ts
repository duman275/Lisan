// Efsane kitaplar kataloğu. `gid`: Project Gutenberg numarası (telifsiz, uygulama içinde tam metin okunabilir/dinlenebilir).
// gid olmayan kitaplar telif kapsamındadır: özet, analiz ve sesli özet sunulur.

export interface CatalogBook {
  title: string;
  original?: string;
  author: string;
  year: string;
  gid?: number;
  note: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  books: CatalogBook[];
}

export const CATALOG: Category[] = [
  {
    id: "klasik",
    name: "Dünya Klasikleri",
    icon: "🏛️",
    books: [
      { title: "Gurur ve Önyargı", original: "Pride and Prejudice", author: "Jane Austen", year: "1813", gid: 1342, note: "İlk izlenimlerin yanılgısı ve zekâ dolu bir aşk." },
      { title: "Moby Dick", original: "Moby-Dick", author: "Herman Melville", year: "1851", gid: 2701, note: "Takıntı, doğa ve anlam arayışının destanı." },
      { title: "Jane Eyre", author: "Charlotte Brontë", year: "1847", gid: 1260, note: "Bağımsızlık ve vicdan üzerine gotik bir büyüme romanı." },
      { title: "Uğultulu Tepeler", original: "Wuthering Heights", author: "Emily Brontë", year: "1847", gid: 768, note: "Yıkıcı tutku ve intikamın vahşi manzarası." },
      { title: "Büyük Umutlar", original: "Great Expectations", author: "Charles Dickens", year: "1861", gid: 1400, note: "Sınıf, hırs ve vicdan." },
      { title: "İki Şehrin Hikâyesi", original: "A Tale of Two Cities", author: "Charles Dickens", year: "1859", gid: 98, note: "Fransız Devrimi gölgesinde fedakârlık." },
      { title: "Sefiller", original: "Les Misérables", author: "Victor Hugo", year: "1862", gid: 135, note: "Adalet, merhamet ve kurtuluş." },
      { title: "Monte Kristo Kontu", original: "The Count of Monte Cristo", author: "Alexandre Dumas", year: "1844", gid: 1184, note: "İntikamın en büyük macerası." },
      { title: "Don Kişot", original: "Don Quixote", author: "Miguel de Cervantes", year: "1605", gid: 996, note: "İlk modern roman: hayal ile gerçek." },
      { title: "Madam Bovary", original: "Madame Bovary", author: "Gustave Flaubert", year: "1857", gid: 2413, note: "Romantik hayallerin taşra gerçekliğiyle çarpışması." },
      { title: "Dorian Gray'in Portresi", original: "The Picture of Dorian Gray", author: "Oscar Wilde", year: "1890", gid: 174, note: "Güzellik, ahlak ve ikili yaşam." },
      { title: "Kızıl Damga", original: "The Scarlet Letter", author: "Nathaniel Hawthorne", year: "1850", gid: 33, note: "Günah, utanç ve toplumsal yargı." },
    ],
  },
  {
    id: "rus",
    name: "Rus Edebiyatı",
    icon: "❄️",
    books: [
      { title: "Suç ve Ceza", original: "Crime and Punishment", author: "Fyodor Dostoyevski", year: "1866", gid: 2554, note: "Vicdanın psikolojik gerilimi." },
      { title: "Karamazov Kardeşler", original: "The Brothers Karamazov", author: "Fyodor Dostoyevski", year: "1880", gid: 28054, note: "İnanç, özgürlük ve baba-oğul çatışması." },
      { title: "Budala", original: "The Idiot", author: "Fyodor Dostoyevski", year: "1869", gid: 2638, note: "Saf iyiliğin bozuk dünyadaki trajedisi." },
      { title: "Yeraltından Notlar", original: "Notes from Underground", author: "Fyodor Dostoyevski", year: "1864", gid: 600, note: "Varoluşçuluğun habercisi bir iç monolog." },
      { title: "Savaş ve Barış", original: "War and Peace", author: "Lev Tolstoy", year: "1869", gid: 2600, note: "Tarih, aile ve anlamın panoraması." },
      { title: "Anna Karenina", author: "Lev Tolstoy", year: "1878", gid: 1399, note: "Aşk, toplum ve ahlak." },
      { title: "Ölü Canlar", original: "Dead Souls", author: "Nikolay Gogol", year: "1842", gid: 1081, note: "Rus taşrasının keskin hicvi." },
      { title: "Usta ile Margarita", author: "Mihail Bulgakov", year: "1967", note: "Şeytan Moskova'da: büyülü hiciv." },
      { title: "Oblomov", author: "İvan Gonçarov", year: "1859", note: "Tembelliğin felsefesi." },
    ],
  },
  {
    id: "distopya",
    name: "Distopya",
    icon: "👁️",
    books: [
      { title: "1984", author: "George Orwell", year: "1949", note: "Gözetim, propaganda ve hakikatin yok edilişi." },
      { title: "Cesur Yeni Dünya", original: "Brave New World", author: "Aldous Huxley", year: "1932", note: "Haz ile köleleştirilmiş bir toplum." },
      { title: "Fahrenheit 451", author: "Ray Bradbury", year: "1953", note: "Kitapların yakıldığı dünya." },
      { title: "Biz", original: "We", author: "Yevgeni Zamyatin", year: "1924", note: "Modern distopyanın atası." },
      { title: "Damızlık Kızın Öyküsü", original: "The Handmaid's Tale", author: "Margaret Atwood", year: "1985", note: "Teokratik baskı ve beden politikası." },
      { title: "Hayvan Çiftliği", original: "Animal Farm", author: "George Orwell", year: "1945", note: "Devrimin kendini yiyişi üzerine fabl." },
      { title: "Otomatik Portakal", original: "A Clockwork Orange", author: "Anthony Burgess", year: "1962", note: "Özgür irade ve şiddet." },
      { title: "Beni Asla Bırakma", original: "Never Let Me Go", author: "Kazuo Ishiguro", year: "2005", note: "Sessiz, yürek burkan bir insanlık sorusu." },
    ],
  },
  {
    id: "bilimkurgu",
    name: "Bilimkurgu",
    icon: "🚀",
    books: [
      { title: "Frankenstein", author: "Mary Shelley", year: "1818", gid: 84, note: "Bilimkurgunun doğuşu: yaratan ve yaratılan." },
      { title: "Zaman Makinesi", original: "The Time Machine", author: "H. G. Wells", year: "1895", gid: 35, note: "Sınıf ayrımının uzak geleceği." },
      { title: "Dünyalar Savaşı", original: "The War of the Worlds", author: "H. G. Wells", year: "1898", gid: 36, note: "İlk büyük istila hikâyesi." },
      { title: "Denizler Altında Yirmi Bin Fersah", original: "Twenty Thousand Leagues Under the Seas", author: "Jules Verne", year: "1870", gid: 164, note: "Kaptan Nemo ve keşif tutkusu." },
      { title: "Dune", author: "Frank Herbert", year: "1965", note: "Ekoloji, din ve imparatorluk." },
      { title: "Vakıf", original: "Foundation", author: "Isaac Asimov", year: "1951", note: "Psikotarih ve medeniyetin çöküşü." },
      { title: "Solaris", author: "Stanisław Lem", year: "1961", note: "Anlaşılamayan ötekiyle temas." },
      { title: "Karanlığın Sol Eli", original: "The Left Hand of Darkness", author: "Ursula K. Le Guin", year: "1969", note: "Cinsiyet ve sadakat üzerine düşünce deneyi." },
      { title: "Otostopçunun Galaksi Rehberi", original: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", year: "1979", note: "Evrenin en komik rehberi." },
      { title: "Neuromancer", author: "William Gibson", year: "1984", note: "Siberpunk'ın kurucu metni." },
    ],
  },
  {
    id: "fantastik",
    name: "Fantastik & Mitoloji",
    icon: "🐉",
    books: [
      { title: "Yüzüklerin Efendisi", original: "The Lord of the Rings", author: "J. R. R. Tolkien", year: "1954", note: "Modern fantastiğin temeli." },
      { title: "Hobbit", original: "The Hobbit", author: "J. R. R. Tolkien", year: "1937", note: "Sıradan birinin büyük macerası." },
      { title: "Harry Potter ve Felsefe Taşı", original: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling", year: "1997", note: "Bir neslin büyülü kapısı." },
      { title: "Taht Oyunları", original: "A Game of Thrones", author: "George R. R. Martin", year: "1996", note: "Güç, aile ve gri karakterler." },
      { title: "Yerdeniz Büyücüsü", original: "A Wizard of Earthsea", author: "Ursula K. Le Guin", year: "1968", note: "Gölgeyle yüzleşmek." },
      { title: "Odysseia", original: "The Odyssey", author: "Homeros", year: "MÖ 8. yy", gid: 1727, note: "Eve dönüşün ölümsüz yolculuğu." },
      { title: "İlyada", original: "The Iliad", author: "Homeros", year: "MÖ 8. yy", gid: 6130, note: "Öfke, onur ve Truva." },
      { title: "Beowulf", author: "Anonim", year: "8.–11. yy", gid: 16328, note: "Canavarlar ve kahramanlık." },
      { title: "Binbir Gece Masalları", original: "The Arabian Nights", author: "Anonim", year: "9.–14. yy", gid: 128, note: "Şehrazat'ın hayatta kalma sanatı." },
      { title: "Alice Harikalar Diyarında", original: "Alice's Adventures in Wonderland", author: "Lewis Carroll", year: "1865", gid: 11, note: "Mantık ve saçmanın oyunu." },
    ],
  },
  {
    id: "polisiye",
    name: "Polisiye & Gerilim",
    icon: "🔍",
    books: [
      { title: "Sherlock Holmes'un Maceraları", original: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", year: "1892", gid: 1661, note: "Dedüksiyonun ustası." },
      { title: "Baskerville'lerin Köpeği", original: "The Hound of the Baskervilles", author: "Arthur Conan Doyle", year: "1902", gid: 2852, note: "Bataklıkta gotik bir gizem." },
      { title: "Dracula", author: "Bram Stoker", year: "1897", gid: 345, note: "Mektuplarla örülmüş korku klasiği." },
      { title: "Dr. Jekyll ve Bay Hyde", original: "Strange Case of Dr Jekyll and Mr Hyde", author: "R. L. Stevenson", year: "1886", gid: 43, note: "İnsanın ikili doğası." },
      { title: "On Küçük Zenci / Ve Sonra Hiç Kalmadı", original: "And Then There Were None", author: "Agatha Christie", year: "1939", note: "Kapalı adada kusursuz gerilim." },
      { title: "Gülün Adı", original: "Il nome della rosa", author: "Umberto Eco", year: "1980", note: "Manastırda göstergebilimsel cinayet." },
      { title: "Kuzuların Sessizliği", original: "The Silence of the Lambs", author: "Thomas Harris", year: "1988", note: "Psikolojik gerilimin zirvesi." },
    ],
  },
  {
    id: "felsefe",
    name: "Felsefe & Düşünce",
    icon: "🦉",
    books: [
      { title: "Devlet", original: "The Republic", author: "Platon", year: "MÖ 375", gid: 1497, note: "Adalet ve ideal devlet." },
      { title: "Kendime Düşünceler", original: "Meditations", author: "Marcus Aurelius", year: "180", gid: 2680, note: "Stoacılığın cep kitabı." },
      { title: "Böyle Buyurdu Zerdüşt", original: "Thus Spake Zarathustra", author: "Friedrich Nietzsche", year: "1883", gid: 1998, note: "Üstinsan ve değerlerin yeniden değerlendirilmesi." },
      { title: "İyinin ve Kötünün Ötesinde", original: "Beyond Good and Evil", author: "Friedrich Nietzsche", year: "1886", gid: 4363, note: "Ahlakın soykütüğüne giriş." },
      { title: "Prens", original: "The Prince", author: "Niccolò Machiavelli", year: "1532", gid: 1232, note: "İktidarın soğuk gerçekçiliği." },
      { title: "Savaş Sanatı", original: "The Art of War", author: "Sun Tzu", year: "MÖ 5. yy", gid: 132, note: "Strateji klasiği." },
      { title: "Walden", author: "Henry David Thoreau", year: "1854", gid: 205, note: "Sade yaşamın deneyi." },
      { title: "Candide", author: "Voltaire", year: "1759", gid: 19942, note: "İyimserliğin hicvi." },
      { title: "Sofi'nin Dünyası", original: "Sofies verden", author: "Jostein Gaarder", year: "1991", note: "Roman biçiminde felsefe tarihi." },
    ],
  },
  {
    id: "varolus",
    name: "Varoluşçuluk & Modern Klasikler",
    icon: "🌫️",
    books: [
      { title: "Dönüşüm", original: "Metamorphosis", author: "Franz Kafka", year: "1915", gid: 5200, note: "Yabancılaşmanın en çarpıcı imgesi." },
      { title: "Dava", original: "The Trial", author: "Franz Kafka", year: "1925", gid: 7849, note: "Anlamsız bürokrasi ve suçluluk." },
      { title: "Yabancı", original: "L'Étranger", author: "Albert Camus", year: "1942", note: "Absürt ve kayıtsızlık." },
      { title: "Bulantı", original: "La Nausée", author: "Jean-Paul Sartre", year: "1938", note: "Varoluşun ağırlığı." },
      { title: "Siddhartha", author: "Hermann Hesse", year: "1922", gid: 2500, note: "Kendini bulma yolculuğu." },
      { title: "Karanlığın Yüreği", original: "Heart of Darkness", author: "Joseph Conrad", year: "1899", gid: 219, note: "Sömürgeciliğin ve insanın karanlığı." },
      { title: "Muhteşem Gatsby", original: "The Great Gatsby", author: "F. Scott Fitzgerald", year: "1925", gid: 64317, note: "Amerikan rüyasının çöküşü." },
      { title: "Ulysses", author: "James Joyce", year: "1922", gid: 4300, note: "Dublin'de tek bir gün, bilinç akışı." },
      { title: "Bülbülü Öldürmek", original: "To Kill a Mockingbird", author: "Harper Lee", year: "1960", note: "Adalet ve masumiyet." },
      { title: "Çavdar Tarlasında Çocuklar", original: "The Catcher in the Rye", author: "J. D. Salinger", year: "1951", note: "Ergenlik ve sahicilik arayışı." },
      { title: "Küçük Prens", original: "Le Petit Prince", author: "Antoine de Saint-Exupéry", year: "1943", note: "Büyükler için bir çocuk masalı." },
    ],
  },
  {
    id: "latin",
    name: "Latin Amerika & Büyülü Gerçekçilik",
    icon: "🦋",
    books: [
      { title: "Yüzyıllık Yalnızlık", original: "Cien años de soledad", author: "Gabriel García Márquez", year: "1967", note: "Macondo ve Buendía ailesinin döngüsü." },
      { title: "Kolera Günlerinde Aşk", original: "El amor en los tiempos del cólera", author: "Gabriel García Márquez", year: "1985", note: "Yarım asır bekleyen aşk." },
      { title: "Ficciones", author: "Jorge Luis Borges", year: "1944", note: "Labirentler, aynalar ve sonsuz kütüphane." },
      { title: "Ruhlar Evi", original: "La casa de los espíritus", author: "Isabel Allende", year: "1982", note: "Üç kuşak kadın ve siyaset." },
      { title: "Pedro Páramo", author: "Juan Rulfo", year: "1955", note: "Hayaletlerle dolu bir kasaba." },
      { title: "Simyacı", original: "O Alquimista", author: "Paulo Coelho", year: "1988", note: "Kişisel efsanenin peşinde." },
    ],
  },
  {
    id: "turk",
    name: "Türk Edebiyatı",
    icon: "🌷",
    books: [
      { title: "Tutunamayanlar", author: "Oğuz Atay", year: "1972", note: "Türk romanında modernizmin zirvesi." },
      { title: "Saatleri Ayarlama Enstitüsü", author: "Ahmet Hamdi Tanpınar", year: "1961", note: "Doğu-Batı arasında ironik bir alegori." },
      { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali", year: "1943", note: "Yalnızlık ve kayıp aşk." },
      { title: "İnce Memed", author: "Yaşar Kemal", year: "1955", note: "Çukurova'da başkaldırı destanı." },
      { title: "Aylak Adam", author: "Yusuf Atılgan", year: "1959", note: "Kentli yabancılaşma." },
      { title: "Benim Adım Kırmızı", author: "Orhan Pamuk", year: "1998", note: "Minyatür, cinayet ve bakış." },
      { title: "Huzur", author: "Ahmet Hamdi Tanpınar", year: "1949", note: "İstanbul, aşk ve medeniyet krizi." },
      { title: "Çalıkuşu", author: "Reşat Nuri Güntekin", year: "1922", note: "Anadolu'da idealist bir öğretmen." },
      { title: "Tehlikeli Oyunlar", author: "Oğuz Atay", year: "1973", note: "Oyunla gerçeğin iç içe geçişi." },
    ],
  },
  {
    id: "siir-tiyatro",
    name: "Şiir & Tiyatro",
    icon: "🎭",
    books: [
      { title: "Hamlet", author: "William Shakespeare", year: "1603", gid: 1524, note: "Olmak ya da olmamak." },
      { title: "Macbeth", author: "William Shakespeare", year: "1606", gid: 1533, note: "Hırsın kanlı bedeli." },
      { title: "Romeo ve Juliet", original: "Romeo and Juliet", author: "William Shakespeare", year: "1597", gid: 1513, note: "Yasak aşkın trajedisi." },
      { title: "İlahi Komedya", original: "The Divine Comedy", author: "Dante Alighieri", year: "1320", gid: 8800, note: "Cehennemden cennete yolculuk." },
      { title: "Çimen Yaprakları", original: "Leaves of Grass", author: "Walt Whitman", year: "1855", gid: 1322, note: "Demokratik ruhun şiiri." },
      { title: "Çorak Ülke", original: "The Waste Land", author: "T. S. Eliot", year: "1922", gid: 1321, note: "Modernist şiirin anıtı." },
      { title: "Godot'yu Beklerken", original: "En attendant Godot", author: "Samuel Beckett", year: "1953", note: "Bekleyişin absürt tiyatrosu." },
    ],
  },
  {
    id: "cocuk",
    name: "Çocuk & Masal Klasikleri",
    icon: "🧸",
    books: [
      { title: "Grimm Masalları", original: "Grimms' Fairy Tales", author: "Grimm Kardeşler", year: "1812", gid: 2591, note: "Avrupa masallarının kaynağı." },
      { title: "Andersen Masalları", original: "Andersen's Fairy Tales", author: "H. C. Andersen", year: "1835", gid: 1597, note: "Hüzünlü ve bilge masallar." },
      { title: "Ezop Masalları", original: "Aesop's Fables", author: "Ezop", year: "MÖ 6. yy", gid: 21, note: "Kısa ve öğretici fabllar — dil öğrenmeye ideal." },
      { title: "Peter Pan", author: "J. M. Barrie", year: "1911", gid: 16, note: "Büyümeyen çocuk." },
      { title: "Oz Büyücüsü", original: "The Wonderful Wizard of Oz", author: "L. Frank Baum", year: "1900", gid: 55, note: "Eve giden sarı tuğlalı yol." },
      { title: "Define Adası", original: "Treasure Island", author: "R. L. Stevenson", year: "1883", gid: 120, note: "Korsanlar ve hazine haritası." },
      { title: "Tom Sawyer'ın Maceraları", original: "The Adventures of Tom Sawyer", author: "Mark Twain", year: "1876", gid: 74, note: "Mississippi kıyısında çocukluk." },
      { title: "Vahşetin Çağrısı", original: "The Call of the Wild", author: "Jack London", year: "1903", gid: 215, note: "Bir köpeğin özüne dönüşü." },
    ],
  },
  {
    id: "dusunce",
    name: "Tarih, Bilim & Fikir Kitapları",
    icon: "🧭",
    books: [
      { title: "Türlerin Kökeni", original: "On the Origin of Species", author: "Charles Darwin", year: "1859", gid: 1228, note: "Biyolojiyi değiştiren kitap." },
      { title: "Sapiens", author: "Yuval Noah Harari", year: "2011", note: "İnsanlığın kısa tarihi." },
      { title: "Tüfek, Mikrop ve Çelik", original: "Guns, Germs, and Steel", author: "Jared Diamond", year: "1997", note: "Medeniyetlerin kaderi neden farklı?" },
      { title: "Hızlı ve Yavaş Düşünme", original: "Thinking, Fast and Slow", author: "Daniel Kahneman", year: "2011", note: "Zihnin iki sistemi." },
      { title: "İnsanın Anlam Arayışı", original: "Man's Search for Meaning", author: "Viktor E. Frankl", year: "1946", note: "Toplama kampından anlam dersi." },
      { title: "Kozmos", original: "Cosmos", author: "Carl Sagan", year: "1980", note: "Evrene şiirsel bir bakış." },
      { title: "Atomik Alışkanlıklar", original: "Atomic Habits", author: "James Clear", year: "2018", note: "Küçük değişikliklerin bileşik etkisi." },
    ],
  },
];
