import dayjs, { type Dayjs } from 'dayjs';
import i18n, { type Language } from '@/i18n';

export type DateInput = string | number | Date | Dayjs | null | undefined;

const getFormatByLanguage = (language: Language): string => {
  switch (language) {
    case 'en':
      // Например: Jan 5, 2025, 14:30
      return 'MMM D, YYYY, HH:mm';
    case 'kg':
      // Формат, привычный для KG, но с кириллическими месяцами через ru-локаль dayjs
      return 'DD.MM.YYYY, HH:mm';
    case 'ru':
    default:
      return 'DD.MM.YYYY, HH:mm';
  }
};

const getDayjsLocale = (language: Language): string => {
  if (language === 'en') return 'en';
  // Для ru и kg используем одну локаль dayjs, чтобы не тащить лишние пакеты
  return 'ru';
};

export const formatDateTime = (value: DateInput, fallback = ''): string => {
  if (!value) return fallback;

  const language = i18n.getLanguage();
  const format = getFormatByLanguage(language);
  const locale = getDayjsLocale(language);

  const d = dayjs(value);
  if (!d.isValid()) return fallback;

  return d.locale(locale).format(format);
};

export const formatDate = (value: DateInput, fallback = ''): string => {
  if (!value) return fallback;

  const language = i18n.getLanguage();
  const locale = getDayjsLocale(language);
  const format = language === 'en' ? 'MMM D, YYYY' : 'DD.MM.YYYY';

  const d = dayjs(value);
  if (!d.isValid()) return fallback;

  return d.locale(locale).format(format);
};

/**
 * Форматирует относительное время (например, "5 минут назад")
 * Использует простую логику без плагинов для совместимости
 */
export const formatRelativeTime = (value: DateInput): string => {
  if (!value) return '';
  
  const d = dayjs(value);
  if (!d.isValid()) return '';

  const now = dayjs();
  const diffMinutes = now.diff(d, 'minute');
  const diffHours = now.diff(d, 'hour');
  const diffDays = now.diff(d, 'day');

  const language = i18n.getLanguage();

  if (diffMinutes < 1) {
    return language === 'en' ? 'Just now' : language === 'kg' ? 'Азыр' : 'Только что';
  } else if (diffMinutes < 60) {
    const text = language === 'en' ? 'minutes ago' : language === 'kg' ? 'минут мурун' : 'минут назад';
    return `${diffMinutes} ${text}`;
  } else if (diffHours < 24) {
    const text = language === 'en' ? 'hours ago' : language === 'kg' ? 'саат мурун' : 'часов назад';
    return `${diffHours} ${text}`;
  } else if (diffDays < 7) {
    const text = language === 'en' ? 'days ago' : language === 'kg' ? 'күн мурун' : 'дней назад';
    return `${diffDays} ${text}`;
  } else {
    return formatDate(d);
  }
};


