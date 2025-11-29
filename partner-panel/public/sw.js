// Service Worker для YESS Partner Panel PWA
const CACHE_NAME = 'yess-partner-v1.0.0';
const STATIC_CACHE_NAME = 'yess-partner-static-v1.0.0';
const API_CACHE_NAME = 'yess-partner-api-v1.0.0';

// Ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API эндпоинты для кэширования
const API_ENDPOINTS = [
  '/api/v1/dashboard',
  '/api/v1/profile',
  '/api/v1/transactions',
  '/api/v1/promotions',
  '/api/v1/locations'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  event.waitUntil(
    Promise.all([
      // Кэшируем статические ресурсы
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Кэширование статических ресурсов');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Failed to cache some static assets:', err);
        });
      }),
      // Пропускаем ожидание активации
      self.skipWaiting()
    ])
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  event.waitUntil(
    Promise.all([
      // Очищаем старые кэши
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== API_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Принимаем контроль над клиентами
      self.clients.claim()
    ])
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return;

  // Пропускаем запросы к другим доменам (кроме API)
  if (url.origin !== location.origin && !url.pathname.startsWith('/api/')) return;

  // Стратегия для API запросов - Network First с fallback на cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Стратегия для статических ресурсов - Cache First
  if (STATIC_ASSETS.includes(url.pathname) ||
      url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Для остальных запросов - Network First
  event.respondWith(networkFirstStrategy(request));
});

// Стратегия Cache First
async function cacheFirstStrategy(request) {
  try {
    // Сначала пытаемся взять из кэша
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }

    // Если нет в кэше, загружаем из сети
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Кэшируем успешный ответ
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    // Возвращаем оффлайн страницу если доступна
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    throw error;
  }
}

// Стратегия Network First
async function networkFirstStrategy(request) {
  try {
    // Сначала пытаемся загрузить из сети
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Кэшируем успешный ответ
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] Network response cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Если сеть недоступна, пытаемся взять из кэша
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // Если ничего нет, возвращаем ошибку
    console.error('[SW] No cache available:', error);
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Сеть недоступна, данные отсутствуют в кэше'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
