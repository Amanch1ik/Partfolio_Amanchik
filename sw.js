// Network-first SW: онлайн всегда свежий контент, кэш — запасной для офлайна.
// (Старый cache-first отдавал устаревший index.html навсегда — отсюда «правки не видны».)
const CACHE_NAME = 'portfolio-v4';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './enhance.css',
    './script.js',
    './enhance.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(
                ASSETS.map((url) => cache.add(url).catch((err) => console.log('Failed to cache:', url, err)))
            )
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Network-first для GET: пробуем сеть, обновляем кэш, при офлайне — отдаём кэш.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
