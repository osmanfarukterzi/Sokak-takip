// Meydan service worker: uygulamanın telefona yüklenebilmesi için.
// Veriler canlı olduğu için önbellek kullanılmaz; her istek ağdan gelir.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
