/**
 * Система метрик для отслеживания API запросов
 * Собирает статистику: количество запросов, ошибок, время выполнения
 */

export interface ApiRequestMetric {
  url: string;
  method: string;
  status?: number;
  duration: number;
  timestamp: number;
  error?: string;
  success: boolean;
}

export interface ApiMetricsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageDuration: number;
  requestsByStatus: Record<number, number>;
  requestsByEndpoint: Record<string, number>;
  errors: Array<{ url: string; error: string; timestamp: number }>;
  lastRequestTime: number;
}

class ApiMetricsCollector {
  private metrics: ApiRequestMetric[] = [];
  private maxMetricsCount = 1000; // Храним последние 1000 запросов
  private readonly storageKey = 'api_metrics';
  private readonly enabled: boolean;

  constructor() {
    // Включено всегда, но можно отключить через env
    this.enabled = import.meta.env.VITE_ENABLE_METRICS !== 'false';
    
    // Загружаем сохраненные метрики при инициализации
    this.loadFromStorage();
  }

  /**
   * Записывает метрику запроса
   */
  recordRequest(metric: ApiRequestMetric): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Ограничиваем количество метрик
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics.shift();
    }

    // Периодически сохраняем в localStorage (каждые 10 запросов)
    if (this.metrics.length % 10 === 0) {
      this.saveToStorage();
    }
  }

  /**
   * Получает сводку метрик
   */
  getSummary(timeWindow?: number): ApiMetricsSummary {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantMetrics = windowStart > 0
      ? this.metrics.filter(m => m.timestamp >= windowStart)
      : this.metrics;

    const totalRequests = relevantMetrics.length;
    const successfulRequests = relevantMetrics.filter(m => m.success).length;
    const failedRequests = relevantMetrics.filter(m => !m.success).length;
    
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    const requestsByStatus: Record<number, number> = {};
    const requestsByEndpoint: Record<string, number> = {};
    const errors: Array<{ url: string; error: string; timestamp: number }> = [];

    relevantMetrics.forEach(metric => {
      // Статусы
      if (metric.status) {
        requestsByStatus[metric.status] = (requestsByStatus[metric.status] || 0) + 1;
      }

      // Endpoints
      const endpoint = this.extractEndpoint(metric.url);
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;

      // Ошибки
      if (!metric.success && metric.error) {
        errors.push({
          url: metric.url,
          error: metric.error,
          timestamp: metric.timestamp,
        });
      }
    });

    const lastRequestTime = relevantMetrics.length > 0
      ? relevantMetrics[relevantMetrics.length - 1].timestamp
      : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalDuration,
      averageDuration,
      requestsByStatus,
      requestsByEndpoint,
      errors: errors.slice(-50), // Последние 50 ошибок
      lastRequestTime,
    };
  }

  /**
   * Получает метрики за последние N минут
   */
  getRecentMetrics(minutes: number = 5): ApiMetricsSummary {
    return this.getSummary(minutes * 60 * 1000);
  }

  /**
   * Очищает все метрики
   */
  clear(): void {
    this.metrics = [];
    this.saveToStorage();
  }

  /**
   * Получает все метрики (для экспорта)
   */
  getAllMetrics(): ApiRequestMetric[] {
    return [...this.metrics];
  }

  /**
   * Извлекает endpoint из полного URL
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      // Берем последние 2 части пути для группировки
      return pathParts.slice(-2).join('/') || urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Сохраняет метрики в localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        metrics: this.metrics.slice(-100), // Сохраняем только последние 100
        timestamp: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save metrics to storage:', error);
    }
  }

  /**
   * Загружает метрики из localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Загружаем только если данные не старше 1 часа
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (data.timestamp && data.timestamp > oneHourAgo && data.metrics) {
          this.metrics = data.metrics;
        }
      }
    } catch (error) {
      console.warn('Failed to load metrics from storage:', error);
    }
  }

  /**
   * Экспортирует метрики в JSON для отправки на сервер
   */
  exportMetrics(): string {
    const summary = this.getSummary();
    const exportData = {
      summary,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton экземпляр
export const apiMetricsCollector = new ApiMetricsCollector();

/**
 * Хук для интеграции с axios интерцепторами
 */
export function createMetricsInterceptor() {
  const startTimes = new Map<string, number>();

  return {
    request: (config: any) => {
      const requestId = `${config.method}-${config.url}-${Date.now()}-${Math.random()}`;
      (config as any).metricsRequestId = requestId;
      startTimes.set(requestId, Date.now());
      return config;
    },

    response: (response: any) => {
      const requestId = (response.config as any)?.metricsRequestId;
      if (requestId) {
        const startTime = startTimes.get(requestId);
        if (startTime !== undefined) {
          const duration = Date.now() - startTime;
          apiMetricsCollector.recordRequest({
            url: response.config.url || '',
            method: response.config.method?.toUpperCase() || 'GET',
            status: response.status,
            duration,
            timestamp: Date.now(),
            success: response.status >= 200 && response.status < 300,
          });
          startTimes.delete(requestId);
        }
      }
      return response;
    },

    error: (error: any) => {
      const config = error.config || error.request?.config;
      const requestId = config?.metricsRequestId;
      
      if (requestId) {
        const startTime = startTimes.get(requestId);
        if (startTime !== undefined) {
          const duration = Date.now() - startTime;
          const status = error.response?.status;
          const errorMessage = error.message || error.response?.data?.detail || 'Unknown error';
          
          apiMetricsCollector.recordRequest({
            url: config?.url || error.config?.url || '',
            method: config?.method?.toUpperCase() || 'GET',
            status,
            duration,
            timestamp: Date.now(),
            error: errorMessage,
            success: false,
          });
          startTimes.delete(requestId);
        }
      }
      
      return Promise.reject(error);
    },
  };
}

