/**
 * Мониторинг производительности приложения
 * Отслеживает метрики Web Vitals, время загрузки, производительность рендеринга
 */

export interface PerformanceMetrics {
  // Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte

  // Custom metrics
  pageLoadTime?: number;
  apiCallCount?: number;
  renderTime?: number;
  
  timestamp: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  url: string;
  userAgent: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = { timestamp: Date.now() };
  private observers: PerformanceObserver[] = [];
  private readonly enabled: boolean;
  private reportCallback?: (report: PerformanceReport) => void;

  constructor() {
    this.enabled = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false';
    
    if (this.enabled) {
      this.initializeObservers();
      this.measurePageLoad();
    }
  }

  /**
   * Инициализирует наблюдатели для Web Vitals
   */
  private initializeObservers(): void {
    // First Contentful Paint (FCP)
    this.observeMetric('paint', (entry: PerformanceEntry) => {
      if (entry.name === 'first-contentful-paint') {
        this.metrics.fcp = Math.round(entry.startTime);
      }
    });

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      this.metrics.lcp = Math.round(entry.renderTime || entry.loadTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry: any) => {
      this.metrics.fid = Math.round(entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        this.metrics.cls = Math.round(clsValue * 1000) / 1000;
      }
    });

    // Navigation Timing для TTFB
    this.measureTTFB();
  }

  /**
   * Создает наблюдатель для метрики
   */
  private observeMetric(
    type: string,
    callback: (entry: any) => void,
    options?: PerformanceObserverInit
  ): void {
    try {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            callback(entry);
          }
        });

        observer.observe({
          type,
          buffered: true,
          ...options,
        } as PerformanceObserverInit);

        this.observers.push(observer);
      }
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  /**
   * Измеряет Time to First Byte (TTFB)
   */
  private measureTTFB(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.ttfb = Math.round(navigation.responseStart - navigation.requestStart);
      }
    } catch (error) {
      console.warn('Failed to measure TTFB:', error);
    }
  }

  /**
   * Измеряет время загрузки страницы
   */
  private measurePageLoad(): void {
    if (document.readyState === 'complete') {
      this.calculatePageLoadTime();
    } else {
      window.addEventListener('load', () => {
        this.calculatePageLoadTime();
      });
    }
  }

  /**
   * Вычисляет время загрузки страницы
   */
  private calculatePageLoadTime(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
      }
    } catch (error) {
      console.warn('Failed to calculate page load time:', error);
    }
  }

  /**
   * Измеряет время рендеринга компонента
   */
  measureRenderTime<T>(componentName: string, renderFn: () => T): T {
    if (!this.enabled) {
      return renderFn();
    }

    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    const renderTime = Math.round(endTime - startTime);

    // Сохраняем максимальное время рендеринга
    if (!this.metrics.renderTime || renderTime > this.metrics.renderTime) {
      this.metrics.renderTime = renderTime;
    }

    // В development логируем медленные рендеры
    if (import.meta.env.DEV && renderTime > 100) {
      console.warn(`⚠️ Slow render: ${componentName} took ${renderTime}ms`);
    }

    return result;
  }

  /**
   * Обновляет количество API вызовов
   */
  updateApiCallCount(count: number): void {
    this.metrics.apiCallCount = count;
  }

  /**
   * Получает текущие метрики
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Генерирует отчет о производительности
   */
  generateReport(): PerformanceReport {
    return {
      metrics: this.getMetrics(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    };
  }

  /**
   * Устанавливает callback для отчетов
   */
  onReport(callback: (report: PerformanceReport) => void): void {
    this.reportCallback = callback;
    
    // Отправляем отчет при разгрузке страницы
    window.addEventListener('beforeunload', () => {
      const report = this.generateReport();
      // Используем sendBeacon для надежной отправки
      if (navigator.sendBeacon && this.reportCallback) {
        try {
          const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
          // Можно отправить на сервер через sendBeacon
          // navigator.sendBeacon('/api/v1/metrics/performance', blob);
        } catch (error) {
          console.warn('Failed to send performance report:', error);
        }
      }
    });
  }

  /**
   * Очищает всех наблюдателей
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Проверяет, являются ли метрики хорошими
   */
  getPerformanceScore(): 'good' | 'needs-improvement' | 'poor' {
    const metrics = this.getMetrics();
    let score = 0;
    let total = 0;

    // FCP: < 1.8s = good, 1.8-3s = needs improvement, > 3s = poor
    if (metrics.fcp) {
      total++;
      if (metrics.fcp < 1800) score += 3;
      else if (metrics.fcp < 3000) score += 2;
      else score += 1;
    }

    // LCP: < 2.5s = good, 2.5-4s = needs improvement, > 4s = poor
    if (metrics.lcp) {
      total++;
      if (metrics.lcp < 2500) score += 3;
      else if (metrics.lcp < 4000) score += 2;
      else score += 1;
    }

    // FID: < 100ms = good, 100-300ms = needs improvement, > 300ms = poor
    if (metrics.fid) {
      total++;
      if (metrics.fid < 100) score += 3;
      else if (metrics.fid < 300) score += 2;
      else score += 1;
    }

    // CLS: < 0.1 = good, 0.1-0.25 = needs improvement, > 0.25 = poor
    if (metrics.cls !== undefined) {
      total++;
      if (metrics.cls < 0.1) score += 3;
      else if (metrics.cls < 0.25) score += 2;
      else score += 1;
    }

    if (total === 0) return 'good';

    const averageScore = score / total;
    if (averageScore >= 2.5) return 'good';
    if (averageScore >= 1.5) return 'needs-improvement';
    return 'poor';
  }
}

// Singleton экземпляр
export const performanceMonitor = new PerformanceMonitor();

