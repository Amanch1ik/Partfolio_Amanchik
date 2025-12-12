import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Ant Design 5.x не требует импорта CSS - стили встроены
import './styles/colors.css'; // Цветовая палитра Yess!Go
import './styles/animations.css'; // Глобальные анимации
import './styles/global.css'; // Глобальные стили
import './i18n'; // Инициализация i18n

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

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
