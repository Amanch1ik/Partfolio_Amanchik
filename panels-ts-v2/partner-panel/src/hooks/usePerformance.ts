import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface PerformanceMetrics {
  // Время загрузки страницы
  pageLoadTime?: number;
  // Время до интерактивности
  timeToInteractive?: number;
  // First Contentful Paint
  firstContentfulPaint?: number;
  // Largest Contentful Paint
  largestContentfulPaint?: number;
  // Cumulative Layout Shift
  cumulativeLayoutShift?: number;
  // First Input Delay
  firstInputDelay?: number;
}

interface NetworkMetrics {
  requestUrl: string;
  method: string;
  duration: number;
  status: number;
  contentType?: string;
  size?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics | null = null;
  private observers: PerformanceObserver[] = [];
  private networkRequests: NetworkMetrics[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  init() {
    if (typeof window === 'undefined' || !window.performance) return;

    this.observeNavigationTiming();
    this.observePaintTiming();
    this.observeLayoutShift();
    this.observeNetworkRequests();
    this.observeInteractions();

    // Отправляем метрики каждые 30 секунд
    setInterval(() => this.reportMetrics(), 30000);
  }

  private observeNavigationTiming() {
    if (!window.performance.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const timeToInteractive = timing.domInteractive - timing.navigationStart;

        this.metrics = {
          ...this.metrics,
          pageLoadTime,
          timeToInteractive,
        };

        console.log('[Performance] Page load time:', pageLoadTime, 'ms');
        console.log('[Performance] Time to interactive:', timeToInteractive, 'ms');
      }, 0);
    });
  }

  private observePaintTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics = {
              ...this.metrics,
              firstContentfulPaint: entry.startTime,
            };
            console.log('[Performance] First Contentful Paint:', entry.startTime, 'ms');
          }
        }
      });

      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('[Performance] Paint observer not supported');
    }
  }

  private observeLayoutShift() {
    if (!window.PerformanceObserver) return;

    try {
      let clsValue = 0;
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }

        this.metrics = {
          ...this.metrics,
          cumulativeLayoutShift: clsValue,
        };
      });

      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutObserver);
    } catch (error) {
      console.warn('[Performance] Layout shift observer not supported');
    }
  }

  private observeNetworkRequests() {
    if (!window.PerformanceObserver) return;

    try {
      const networkObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.initiatorType === 'fetch' || resourceEntry.initiatorType === 'xmlhttprequest') {
            const metric: NetworkMetrics = {
              requestUrl: resourceEntry.name,
              method: 'GET', // Performance API не дает метод, но обычно это GET для ресурсов
              duration: resourceEntry.responseEnd - resourceEntry.requestStart,
              status: 200, // Performance API не дает статус ответа
              contentType: resourceEntry.responseStart > 0 ? 'application/json' : undefined,
              size: resourceEntry.transferSize || undefined,
            };

            this.networkRequests.push(metric);

            // Ограничиваем массив последними 100 запросами
            if (this.networkRequests.length > 100) {
              this.networkRequests = this.networkRequests.slice(-100);
            }

            console.log('[Performance] Network request:', metric.requestUrl, metric.duration, 'ms');
          }
        }
      });

      networkObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(networkObserver);
    } catch (error) {
      console.warn('[Performance] Network observer not supported');
    }
  }

  private observeInteractions() {
    if (!window.PerformanceObserver) return;

    try {
      const interactionObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            this.metrics = {
              ...this.metrics,
              firstInputDelay: (entry as any).processingStart - entry.startTime,
            };
            console.log('[Performance] First Input Delay:', (entry as any).processingStart - entry.startTime, 'ms');
          }
        }
      });

      interactionObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(interactionObserver);
    } catch (error) {
      console.warn('[Performance] Interaction observer not supported');
    }
  }

  private reportMetrics() {
    if (!this.metrics) return;

    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...this.metrics,
      networkRequests: this.networkRequests.slice(-10), // Последние 10 запросов
    };

    // Отправляем на сервер аналитики (если настроено)
    if (process.env.NODE_ENV === 'production') {
      // В продакшене отправляем на аналитику
      console.log('[Performance] Metrics report:', report);
    } else {
      // В разработке логируем в консоль
      console.log('[Performance] Development metrics:', report);
    }
  }

  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  getNetworkRequests(): NetworkMetrics[] {
    return [...this.networkRequests];
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

const performanceMonitor = PerformanceMonitor.getInstance();

export const usePerformance = () => {
  const location = useLocation();
  const routeChangeTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Инициализируем мониторинг производительности при первом рендере
    performanceMonitor.init();

    return () => {
      performanceMonitor.cleanup();
    };
  }, []);

  useEffect(() => {
    // Отслеживаем изменение маршрутов
    const now = Date.now();
    const routeChangeTime = now - routeChangeTimeRef.current;

    console.log(`[Performance] Route changed to ${location.pathname} in ${routeChangeTime}ms`);
    routeChangeTimeRef.current = now;
  }, [location.pathname]);

  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  const getNetworkRequests = useCallback(() => {
    return performanceMonitor.getNetworkRequests();
  }, []);

  const reportCustomMetric = useCallback((name: string, value: number, unit: string = 'ms') => {
    console.log(`[Performance] Custom metric: ${name} = ${value}${unit}`);
  }, []);

  return {
    getMetrics,
    getNetworkRequests,
    reportCustomMetric,
  };
};

export default usePerformance;
