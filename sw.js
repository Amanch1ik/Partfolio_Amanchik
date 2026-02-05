const CACHE_NAME = 'portfolio-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './resources/photo.jpg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
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
