// @ts-nocheck
import { useEffect } from 'react';

/**
 * Хук для динамического изменения title страницы
 */
export function useDocumentTitle(title: string, suffix: string = 'YESS!GO') {
  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = title ? `${title} - ${suffix}` : suffix;
    document.title = fullTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [title, suffix]);
}

/**
 * Хук для изменения title с поддержкой локализации
 */
export function useLocalizedDocumentTitle(
  titleKey: string,
  defaultTitle: string,
  suffix: string = 'YESS!GO'
) {
  useEffect(() => {
    // Можно интегрировать с i18n системой
    const title = defaultTitle; // В будущем можно использовать i18n.t(titleKey)
    const fullTitle = title ? `${title} - ${suffix}` : suffix;
    document.title = fullTitle;
  }, [titleKey, defaultTitle, suffix]);
}

