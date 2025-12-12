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

  t(key: string, defaultValue?: string): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }
    
    return typeof value === 'string' ? value : (defaultValue || key);
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
export const t = (key: string, defaultValue?: string) => i18n.t(key, defaultValue);

export default i18n;

