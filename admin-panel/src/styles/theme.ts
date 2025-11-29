// Дизайн-система Yess!Go на основе мудборда
export const theme = {
  colors: {
    // Зеленая палитра из мудборда
    primary: {
      dark: '#0F2A1D',      // Очень темный зеленый
      dark2: '#375534',      // Темно-зеленый
      medium: '#689071',     // Средний зеленый
      light: '#AEC380',      // Светло-зеленый
      pale: '#E3EED4',       // Очень светлый мятный
      vibrant: '#52c41a',    // Яркий зеленый для акцентов
    },
    // Градиенты
    gradients: {
      primary: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
      dark: 'linear-gradient(135deg, #0F2A1D 0%, #375534 100%)',
      light: 'linear-gradient(135deg, #AEC380 0%, #E3EED4 100%)',
      success: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #E3EED4 100%)',
      hover: 'linear-gradient(135deg, #AEC380 0%, #689071 100%)',
    },
    // Статусы
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff',
    // Нейтральные
    text: {
      primary: '#0F2A1D',
      secondary: '#375534',
      tertiary: '#689071',
      disabled: '#bfbfbf',
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f5f5f5',
      lightGreen: '#E3EED4',
      pale: '#F0F7EB',
    },
    border: {
      light: '#E3EED4',
      base: '#AEC380',
      dark: '#689071',
    },
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: '"Geologica", "Inter", sans-serif',
  },
  shadows: {
    sm: '0 2px 4px rgba(15, 42, 29, 0.06)',
    base: '0 2px 8px rgba(15, 42, 29, 0.08)',
    md: '0 4px 12px rgba(15, 42, 29, 0.12)',
    lg: '0 8px 24px rgba(15, 42, 29, 0.16)',
    green: '0 4px 12px rgba(82, 196, 26, 0.2)',
    greenHover: '0 8px 24px rgba(82, 196, 26, 0.3)',
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

