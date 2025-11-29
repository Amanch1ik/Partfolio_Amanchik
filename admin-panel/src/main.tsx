import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nGateway } from './i18nGateway';
// Ant Design 5.x не требует импорта CSS - стили встроены
import './styles/colors.css'; // Цветовая палитра Yess!Go
import './styles/animations.css'; // Глобальные анимации
import './styles/global.css'; // Глобальные стили
import './styles/theme.css'; // Система тем (светлая/тёмная)
import './i18n'; // Инициализация i18n
import I18nProvider from './i18nGatewayContext';

// Настройка dayjs с русской локализацией
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(customParseFormat);
dayjs.extend(localeData);
dayjs.extend(weekday);
dayjs.locale('ru');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Регистрация Service Worker для offline режима
if ('serviceWorker' in navigator) {
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
