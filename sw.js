self.addEventListener('install', (e) => {
    console.log('[Service Worker] Uygulama Kuruldu');
});

self.addEventListener('fetch', (e) => {
    // Veritabanı canlı olduğu için önbellekleme (cache) yapmıyoruz
    // Doğrudan internetten taze veriyi çekmesine izin veriyoruz
    e.respondWith(fetch(e.request));
});
