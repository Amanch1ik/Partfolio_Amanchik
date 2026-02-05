const CACHE_NAME = 'portfolio-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './resources/photo.jpg',
    './resources/icon-192.png',
    './resources/icon-512.png',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Use individual add for resilience
            return Promise.allSettled(
                ASSETS.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url, err)))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
