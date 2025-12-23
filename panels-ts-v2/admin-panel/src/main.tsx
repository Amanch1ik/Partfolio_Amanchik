import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nGateway } from './i18nGateway';
// Ant Design 5.x не требует импорта CSS - стили встроены
import './styles/colors.css'; // Цветовая палитра Yess!Go
import './styles/animations.css'; // Глобальные анимации
import './styles/global.css'; // Глобальные стили
import './styles/theme.css'; // Система тем (светлая/тёмная)
import i18n, { type Language } from './i18n'; // Инициализация i18n и доступ к языку
import I18nProvider from './i18nGatewayContext';

// Инициализация проверки совместимости браузера
import { initBrowserCompatibility, setupOnlineStatusListener } from '@shared/utils/browserCompatibility';

// Настройка dayjs с поддержкой нескольких локалей
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(customParseFormat);
dayjs.extend(localeData);
dayjs.extend(weekday);

const applyDayjsLocale = (lang: Language) => {
  if (lang === 'en') {
    dayjs.locale('en');
  } else {
    // Для кыргызского используем русскую локаль форматов, чтобы избежать падений,
    // пока не будет добавлена полноценная локаль dayjs для ky-KG
    dayjs.locale('ru');
  }
};

// Инициализируем локаль dayjs по текущему языку
applyDayjsLocale(i18n.getLanguage());
// И обновляем её при смене языка через i18n
i18n.subscribe(() => {
  applyDayjsLocale(i18n.getLanguage());
});

// Инициализация проверки браузера и онлайн статуса
const browserInfo = initBrowserCompatibility();

// Настройка отслеживания онлайн статуса
setupOnlineStatusListener(
  () => {
    console.log('✅ Подключение к интернету восстановлено');
  },
  () => {
    console.warn('⚠️ Потеряно подключение к интернету');
  }
);

// Инициализация темы при загрузке - всегда светлая
const initTheme = () => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem('admin_panel_theme', 'light');
  
  // Обновляем мета-тег для мобильных браузеров
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', '#ffffff');
  }
};

// Инициализируем тему сразу при загрузке
initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Агрессивное отключение Service Worker в режиме разработки
// Выполняем ДО рендеринга приложения
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  (async function cleanupServiceWorker() {
    try {
      console.log('🧹 Начинаем отключение Service Worker для разработки...');
      
      // Отправляем сообщение контроллеру для остановки
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Получаем все регистрации и отключаем их
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log(`🗑️ Отключаем ${registrations.length} Service Worker(s)...`);
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('✅ Service Workers отключены');
      }
      
      // Очищаем все кэши
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        console.log(`🗑️ Очищаем ${cacheNames.length} кэша(ей)...`);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Кэши очищены');
      }
      
      console.log('✅ Service Worker полностью отключен для разработки');
      
      // Перезагружаем страницу один раз после очистки
      const hasCleaned = sessionStorage.getItem('sw-cleaned');
      if (!hasCleaned && (registrations.length > 0 || cacheNames.length > 0)) {
        sessionStorage.setItem('sw-cleaned', 'true');
        console.log('🔄 Перезагрузка страницы через 1 секунду...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Ошибка при отключении Service Worker:', error);
    }
  })();
} else if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Регистрация Service Worker только в production режиме
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        // Проверка обновлений
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Новое обновление доступно
                console.log('New Service Worker available');
                // Можно показать уведомление пользователю
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider>
      <I18nGateway>
        <App />
      </I18nGateway>
    </I18nProvider>
  </React.StrictMode>,
);
