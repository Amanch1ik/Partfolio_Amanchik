import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n, { Language } from './i18n';

type I18nContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(i18n.getLanguage());

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => {
      setLanguageState(i18n.getLanguage());
    });
    return unsubscribe;
  }, []);

  const setLanguage = (lang: Language) => {
    i18n.setLanguage(lang);
    // local state will update via subscribe
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
      {/*
        Важно: используем key=language, чтобы принудительно пересоздавать потомков
        при смене языка. Это нужно для компонентов, которые не используют
        сам контекст, но вызывают функцию t(...) напрямую (как в тестах).
      */}
      <React.Fragment key={language}>{children}</React.Fragment>
    </I18nContext.Provider>
  );
};

export const useI18nContext = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return ctx;
};

export default I18nProvider;


