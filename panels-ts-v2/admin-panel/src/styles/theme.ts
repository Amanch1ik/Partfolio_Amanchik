// Дизайн-система Yess!Go на основе мудборда
export const theme = {
  colors: {
    // Зеленая палитра
    primary: {
      dark: '#03533A',      // Очень темный зеленый
      dark2: '#045A42',      // Темно-зеленый
      medium: '#07B981',     // Средний зеленый
      light: '#10B981',      // Светло-зеленый
      pale: '#E8F8F3',       // Очень светлый мятный
      vibrant: '#10B981',    // Яркий зеленый для акцентов
    },
    // Градиенты
    gradients: {
      primary: 'linear-gradient(135deg, #03533A 0%, #07B981 100%)',
      dark: 'linear-gradient(135deg, #03533A 0%, #045A42 100%)',
      light: 'linear-gradient(135deg, #07B981 0%, #E8F8F3 100%)',
      success: 'linear-gradient(135deg, #10B981 0%, #07B981 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #E8F8F3 100%)',
      hover: 'linear-gradient(135deg, #07B981 0%, #03533A 100%)',
    },
    // Статусы
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    // Нейтральные
    text: {
      primary: '#03533A',
      secondary: '#045A42',
      tertiary: '#07B981',
      disabled: '#bfbfbf',
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#F0FDF9',
      lightGreen: '#E8F8F3',
      pale: '#F0FDF9',
    },
    border: {
      light: '#E8F8F3',
      base: '#07B981',
      dark: '#03533A',
    },
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: '"Geologica", "Inter", sans-serif',
  },
  shadows: {
    sm: '0 2px 4px rgba(3, 83, 58, 0.06)',
    base: '0 2px 8px rgba(3, 83, 58, 0.08)',
    md: '0 4px 12px rgba(3, 83, 58, 0.12)',
    lg: '0 8px 24px rgba(3, 83, 58, 0.16)',
    green: '0 4px 12px rgba(7, 185, 129, 0.2)',
    greenHover: '0 8px 24px rgba(7, 185, 129, 0.3)',
  },
  borderRadius: {
    sm: '6px',
    base: '12px',
    md: '16px',
    lg: '24px',
    round: '50%',
  },
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    base: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

export default theme;
