import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light';

const THEME_KEY = 'admin_panel_theme';

export const useTheme = () => {
  // Всегда используем светлую тему
  const [theme] = useState<Theme>('light');

  // Применяем светлую тему при загрузке
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem(THEME_KEY, 'light');
    
    // Обновляем мета-тег для мобильных браузеров
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#ffffff');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    // Игнорируем - всегда светлая тема
  }, []);

  const toggleTheme = useCallback(() => {
    // Игнорируем - всегда светлая тема
  }, []);

  const isDark = false;

  return {
    theme: 'light' as Theme,
    setTheme,
    toggleTheme,
    isDark: false,
  };
};
