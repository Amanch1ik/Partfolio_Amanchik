/**
 * Утилиты для форматирования дат и времени
 * Поддерживает локализацию в зависимости от выбранного языка
 */
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

// Определение форматов для разных языков
const DATE_FORMATS = {
  ru: 'DD.MM.YYYY',
  kg: 'DD.MM.YYYY', // Используем русский формат для кыргызского
  en: 'MMM D, YYYY',
};

const DATETIME_FORMATS = {
  ru: 'DD.MM.YYYY, HH:mm',
  kg: 'DD.MM.YYYY, HH:mm', // Используем русский формат для кыргызского
  en: 'MMM D, YYYY, HH:mm',
};

/**
 * Получает текущий язык из localStorage
 */
function getCurrentLanguage(): 'ru' | 'en' | 'kg' {
  try {
    const lang = localStorage.getItem('language') || 'ru';
    return lang as 'ru' | 'en' | 'kg';
  } catch {
    return 'ru';
  }
}

/**
 * Устанавливает локаль для dayjs
 */
function setDayjsLocale(language: string) {
  if (language === 'en') {
    dayjs.locale('en');
  } else {
    dayjs.locale('ru'); // Для ru и kg используем русскую локаль
  }
}

// Устанавливаем локаль при загрузке модуля
setDayjsLocale(getCurrentLanguage());

/**
 * Форматирует дату и время
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const language = getCurrentLanguage();
    const format = DATETIME_FORMATS[language] || DATETIME_FORMATS.ru;
    setDayjsLocale(language);
    
    const date = dayjs(value);
    if (!date.isValid()) {
      return String(value);
    }
    
    return date.format(format);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return String(value);
  }
}

/**
 * Форматирует только дату
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const language = getCurrentLanguage();
    const format = DATE_FORMATS[language] || DATE_FORMATS.ru;
    setDayjsLocale(language);
    
    const date = dayjs(value);
    if (!date.isValid()) {
      return String(value);
    }
    
    return date.format(format);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return String(value);
  }
}

/**
 * Форматирует относительное время (5 минут назад, 2 часа назад и т.д.)
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const language = getCurrentLanguage();
    setDayjsLocale(language);
    
    const date = dayjs(value);
    if (!date.isValid()) {
      return String(value);
    }
    
    const now = dayjs();
    const diffMinutes = now.diff(date, 'minute');
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');
    
    // Для русского и кыргызского
    if (language === 'ru' || language === 'kg') {
      if (diffMinutes < 1) {
        return 'Только что';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'минуту' : diffMinutes < 5 ? 'минуты' : 'минут'} назад`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
      } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`;
      }
    }
    
    // Для английского используем встроенную функцию dayjs
    return date.fromNow();
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return String(value);
  }
}

