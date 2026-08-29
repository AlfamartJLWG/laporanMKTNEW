// sw.js
const CACHE_NAME = 'mkt-report-v2';
const assetsToCache = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json'
];

// Install Service Worker dan simpan file ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Ambil data dari cache jika offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
