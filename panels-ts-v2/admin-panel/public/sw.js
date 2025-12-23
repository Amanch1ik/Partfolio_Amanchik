// Service Worker для YESS Admin Panel PWA

// КРИТИЧНО: Полностью отключаем Service Worker в режиме разработки
// Проверяем, если мы на localhost:5173 (Vite dev server), не работаем вообще
(function() {
  'use strict';
  
  // Проверка dev режима - если мы на localhost с портом 5173, отключаемся
  // Используем registration.scope для более надежной проверки
  const checkDevMode = () => {
    try {
      const hostname = self.location?.hostname || '';
      const port = self.location?.port || '';
      const scope = self.registration?.scope || '';
      
      // Проверяем несколько способов
      return (hostname === 'localhost' && (port === '5173' || port === '')) ||
             scope.includes('localhost:5173') ||
             scope.includes('localhost/') && port === '5173';
    } catch {
      return false;
    }
  };
  
  const isDev = checkDevMode();
  
  if (isDev) {
    console.log('[SW] 🚫 Dev mode detected - Service Worker disabled');
    
    // В dev режиме сразу отключаемся
    self.addEventListener('install', (event) => {
      console.log('[SW] Skipping installation in dev mode');
      event.waitUntil(
        self.skipWaiting()
      );
    });
    
    self.addEventListener('activate', (event) => {
      console.log('[SW] Deactivating in dev mode');
      event.waitUntil(
        Promise.all([
          // Удаляем все кэши
          caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((cacheName) => {
              return caches.delete(cacheName);
            }));
          }),
          // Отключаемся
          self.clients.claim(),
          // Отменяем регистрацию
          self.registration.unregister().catch(() => {})
        ]).then(() => {
          console.log('[SW] ✅ Service Worker deactivated');
        })
      );
    });
    
    // НЕ перехватываем АБСОЛЮТНО никакие запросы в dev режиме
    self.addEventListener('fetch', (event) => {
      // Просто ничего не делаем - полностью пропускаем
      return;
    }, { passive: true });
    
    // Останавливаем выполнение здесь - код ниже не выполнится
    // Но нужно все равно обработать сообщения для отключения
    self.addEventListener('message', (event) => {
      if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    });
    
    return; // Выходим из IIFE
  }
})();

// Код ниже выполняется ТОЛЬКО в production режиме
const CACHE_NAME = 'yess-admin-v1.0.0';
const STATIC_CACHE_NAME = 'yess-admin-static-v1.0.0';
const API_CACHE_NAME = 'yess-admin-api-v1.0.0';

// Ресурсы для кэширования (только существующие файлы)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// API эндпоинты для кэширования
const API_ENDPOINTS = [
  '/api/v1/admin/dashboard',
  '/api/v1/admin/dashboard/stats',
  '/api/v1/admin/dashboard/charts',
  '/api/v1/admin/stats/transactions'
];

// Установка Service Worker (только в production)
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  event.waitUntil(
    Promise.all([
      // Кэшируем статические ресурсы с обработкой ошибок
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        console.log('[SW] Кэширование статических ресурсов');
        
        // Кэшируем файлы по одному, чтобы один неудачный не блокировал остальные
        const cachePromises = STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`[SW] ✅ Закэширован: ${url}`);
            } else {
              console.warn(`[SW] ⚠️ Пропущен (${response.status}): ${url}`);
            }
          } catch (error) {
            // Тихий провал - файл может не существовать
            console.warn(`[SW] ⚠️ Не удалось закэшировать: ${url}`, error.message);
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('[SW] ✅ Кэширование завершено');
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

  // КРИТИЧНО: Пропускаем ВСЕ запросы к localhost/127.0.0.1 (dev режим)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // Полностью пропускаем ВСЕ запросы к localhost - не обрабатываем вообще
    return;
  }
  
  // Пропускаем запросы к WebSocket (HMR)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  // Пропускаем запросы к Vite client модулям (любые файлы с timestamp - это Vite HMR)
  if (url.pathname.includes('/@vite/') || 
      url.pathname.includes('/@react-refresh') ||
      url.pathname.includes('/@id/') ||
      url.pathname.includes('/@fs/') ||
      url.pathname.startsWith('/node_modules/vite/') ||
      (url.pathname.startsWith('/src/') && url.search.includes('t=')) ||
      url.search.includes('t=')) {
    // Все файлы с timestamp параметром - это Vite HMR
    return;
  }

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
      icon: '/logo192.svg',
      badge: '/logo192.svg',
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
