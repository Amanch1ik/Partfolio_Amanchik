// Сервис аналитики для сбора метрик производительности
interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  userAgent: string;
  url: string;
  sessionId: string;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private isEnabled: boolean;
  private endpoint: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.endpoint = process.env.REACT_APP_ANALYTICS_ENDPOINT || '/api/analytics';
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Отправка события аналитики
  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'userAgent' | 'url' | 'sessionId'>): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Analytics] Event (dev mode):', event);
      return;
    }

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    try {
      await fetch(this.endpoint + '/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      });
    } catch (error) {
      console.warn('[Analytics] Failed to send event:', error);
    }
  }

  // Отправка метрики производительности
  async trackPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'url' | 'userAgent' | 'sessionId'>): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Analytics] Performance metric (dev mode):', metric);
      return;
    }

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
    };

    try {
      await fetch(this.endpoint + '/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullMetric),
      });
    } catch (error) {
      console.warn('[Analytics] Failed to send metric:', error);
    }
  }

  // Отслеживание просмотров страниц
  trackPageView(page: string): void {
    this.trackEvent({
      event: 'page_view',
      category: 'navigation',
      action: 'view',
      label: page,
    });
  }

  // Отслеживание взаимодействий с UI
  trackInteraction(category: string, action: string, label?: string, value?: number): void {
    this.trackEvent({
      event: 'interaction',
      category,
      action,
      label,
      value,
    });
  }

  // Отслеживание ошибок
  trackError(error: Error, context?: string): void {
    this.trackEvent({
      event: 'error',
      category: 'errors',
      action: 'exception',
      label: `${context || 'unknown'}: ${error.message}`,
    });
  }

  // Отслеживание производительности
  trackPerformance(name: string, value: number, unit: string = 'ms'): void {
    this.trackPerformanceMetric({
      metric: name,
      value,
      unit,
    });
  }

  // Отслеживание PWA событий
  trackPWAAction(action: string, details?: string): void {
    this.trackEvent({
      event: 'pwa_action',
      category: 'pwa',
      action,
      label: details,
    });
  }

  // Установка пользовательских свойств
  setUserProperties(properties: Record<string, any>): void {
    // Сохраняем свойства в sessionStorage для использования в событиях
    sessionStorage.setItem('analytics_user_properties', JSON.stringify(properties));
  }

  getUserProperties(): Record<string, any> {
    try {
      const stored = sessionStorage.getItem('analytics_user_properties');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Включение/отключение аналитики
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('analytics_enabled', enabled.toString());
  }

  isAnalyticsEnabled(): boolean {
    const stored = localStorage.getItem('analytics_enabled');
    return stored !== null ? stored === 'true' : this.isEnabled;
  }

  // GDPR compliance - запрос согласия
  requestConsent(): Promise<boolean> {
    return new Promise((resolve) => {
      const consent = window.confirm(
        'Мы используем аналитику для улучшения сервиса. Разрешить сбор анонимных данных?'
      );
      this.setEnabled(consent);
      resolve(consent);
    });
  }
}

// Глобальный экземпляр
export const analytics = AnalyticsService.getInstance();

// Хук для использования аналитики в компонентах
export const useAnalytics = () => {
  const trackEvent = (event: Omit<AnalyticsEvent, 'timestamp' | 'userAgent' | 'url' | 'sessionId'>) => {
    analytics.trackEvent(event);
  };

  const trackPageView = (page: string) => {
    analytics.trackPageView(page);
  };

  const trackInteraction = (category: string, action: string, label?: string, value?: number) => {
    analytics.trackInteraction(category, action, label, value);
  };

  const trackError = (error: Error, context?: string) => {
    analytics.trackError(error, context);
  };

  const trackPerformance = (name: string, value: number, unit?: string) => {
    analytics.trackPerformance(name, value, unit);
  };

  return {
    trackEvent,
    trackPageView,
    trackInteraction,
    trackError,
    trackPerformance,
    setUserProperties: analytics.setUserProperties.bind(analytics),
    isEnabled: analytics.isAnalyticsEnabled(),
    setEnabled: analytics.setEnabled.bind(analytics),
    requestConsent: analytics.requestConsent.bind(analytics),
  };
};

export default analytics;
