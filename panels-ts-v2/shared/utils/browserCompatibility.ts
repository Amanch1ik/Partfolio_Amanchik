/**
 * Утилиты для проверки совместимости браузера и предоставления fallback
 */

export interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  os: string;
}

/**
 * Определяет информацию о браузере
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  // Определяем OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  // Определяем устройство
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  // Определяем браузер и версию
  let name = 'Unknown';
  let version = 0;
  let isSupported = true;
  
  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
    isSupported = version >= 90; // Поддержка Chrome 90+
  }
  // Edge
  else if (ua.includes('Edg')) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
    isSupported = version >= 90;
  }
  // Firefox
  else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
    isSupported = version >= 88;
  }
  // Safari
  else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
    isSupported = version >= 14;
  }
  // Opera
  else if (ua.includes('OPR') || ua.includes('Opera')) {
    name = 'Opera';
    const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
    isSupported = version >= 76;
  }
  else {
    isSupported = false;
  }
  
  return {
    name,
    version,
    isSupported,
    isMobile,
    isTablet,
    isDesktop,
    os,
  };
}

/**
 * Проверяет поддержку необходимых функций браузера
 */
export function checkBrowserFeatures(): {
  passed: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  // Проверяем необходимые API
  if (typeof Promise === 'undefined') {
    missing.push('Promises');
  }
  
  if (typeof fetch === 'undefined') {
    missing.push('Fetch API');
  }
  
  if (typeof localStorage === 'undefined') {
    missing.push('LocalStorage');
  }
  
  if (typeof sessionStorage === 'undefined') {
    missing.push('SessionStorage');
  }
  
  if (!window.IntersectionObserver) {
    missing.push('IntersectionObserver');
  }
  
  if (!Array.from) {
    missing.push('Array.from');
  }
  
  if (!Object.assign) {
    missing.push('Object.assign');
  }
  
  return {
    passed: missing.length === 0,
    missing,
  };
}

/**
 * Показывает предупреждение, если браузер не поддерживается
 */
export function showBrowserWarning(browserInfo: BrowserInfo, features: { passed: boolean; missing: string[] }): void {
  if (!browserInfo.isSupported || !features.passed) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff4d4f;
      color: white;
      padding: 12px 20px;
      text-align: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    
    let message = '⚠️ Ваш браузер устарел и может работать некорректно. ';
    
    if (!browserInfo.isSupported) {
      message += `Рекомендуется обновить ${browserInfo.name} до последней версии.`;
    } else if (features.missing.length > 0) {
      message += `Отсутствуют необходимые функции: ${features.missing.join(', ')}.`;
    }
    
    message += ' Рекомендуемые браузеры: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.';
    
    warning.textContent = message;
    document.body.insertBefore(warning, document.body.firstChild);
    
    // Автоматически скрыть через 10 секунд
    setTimeout(() => {
      warning.style.transition = 'opacity 0.3s';
      warning.style.opacity = '0';
      setTimeout(() => warning.remove(), 300);
    }, 10000);
  }
}

/**
 * Инициализирует проверку браузера и показывает предупреждения при необходимости
 */
export function initBrowserCompatibility(): BrowserInfo {
  const browserInfo = getBrowserInfo();
  const features = checkBrowserFeatures();
  
  // Показываем предупреждение только в production
  if (import.meta.env.PROD) {
    showBrowserWarning(browserInfo, features);
  }
  
  return browserInfo;
}

/**
 * Проверяет наличие подключения к интернету
 */
export function checkOnlineStatus(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Предполагаем, что онлайн, если не можем проверить
}

/**
 * Устанавливает обработчики изменения онлайн статуса
 */
export function setupOnlineStatusListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op для SSR
  }
  
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Возвращаем функцию очистки
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

