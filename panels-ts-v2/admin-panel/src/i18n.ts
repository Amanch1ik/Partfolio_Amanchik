// Полноценная система интернационализации
import { translations, Language, TranslationKey } from './i18n/translations';

class I18n {
  private currentLanguage: Language = 'ru';
  private listeners: Set<() => void> = new Set();

  constructor() {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'en' || savedLanguage === 'kg')) {
      this.currentLanguage = savedLanguage;
    }
  }

  setLanguage(lang: Language) {
    if (this.currentLanguage === lang) return;
    
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    // Уведомляем всех подписчиков об изменении языка
    this.listeners.forEach(listener => listener());
    
    // Обновляем HTML lang атрибут
    document.documentElement.lang = lang;
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: string, defaultValue?: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return this.replaceParams(defaultValue || key, params);
      }
    }
    
    const result = typeof value === 'string' ? value : (defaultValue || key);
    return this.replaceParams(result, params);
  }

  private replaceParams(str: string, params?: Record<string, string | number>): string {
    if (!params || !str) return str;
    
    let result = str;
    Object.entries(params).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
    return result;
  }

  // Подписка на изменения языка
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const i18n = new I18n();

// Инициализация при загрузке
const savedLanguage = localStorage.getItem('language') as Language;
if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'en' || savedLanguage === 'kg')) {
  i18n.setLanguage(savedLanguage);
}

// Экспортируем функцию перевода для удобства
export const t = (key: string, defaultValue?: string, params?: Record<string, string | number>) => 
  i18n.t(key, defaultValue, params);

// Переэкспортируем тип языка, чтобы его можно было импортировать из './i18n'
export type { Language } from './i18n/translations';

export default i18n;


