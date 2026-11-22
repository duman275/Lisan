// Lisan service worker: uygulamayı yüklenebilir yapar ve çevrimdışı çalıştırır.
// Uygulama dosyaları, ücretsiz ders verisi ve açılan kitaplar önbelleğe alınır.
const CACHE = "lisan-v5";
const SCOPE = self.registration.scope;
const CORE = ["", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"].map((p) => SCOPE + p);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !req.url.startsWith(SCOPE)) return; // dış servisler (Wikipedia, yapay zekâ) önbelleğe alınmaz
  // Sayfa: önce ağ (güncel sürüm), çevrimdışıysa önbellek
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE + "index.html", copy));
          return r;
        })
        .catch(() => caches.match(SCOPE + "index.html")),
    );
    return;
  }
  // Dosyalar (assets, data, books): önce önbellek, yoksa indir ve sakla
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return r;
        }),
    ),
  );
});
