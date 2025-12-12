/**
 * Централизованная система мониторинга
 * Экспортирует все модули мониторинга для использования в панелях
 */

export * from './apiMetrics';
export * from './errorLogger';
export * from './performanceMonitor';

import { apiMetricsCollector, createMetricsInterceptor } from './apiMetrics';
import { errorLogger } from './errorLogger';
import { performanceMonitor } from './performanceMonitor';

/**
 * Инициализирует всю систему мониторинга
 */
export function initializeMonitoring(): void {
  console.log('📊 Monitoring system initialized');
  
  // В development выводим метрики в консоль каждые 30 секунд
  if (import.meta.env.DEV) {
    setInterval(() => {
      const apiSummary = apiMetricsCollector.getRecentMetrics(5);
      const errorSummary = errorLogger.getRecentErrors(5);
      const perfMetrics = performanceMonitor.getMetrics();
      
      if (apiSummary.totalRequests > 0 || errorSummary.totalErrors > 0) {
        console.group('📊 Monitoring Summary (last 5 min)');
        console.log('API Requests:', apiSummary.totalRequests);
        console.log('API Errors:', apiSummary.failedRequests);
        console.log('Application Errors:', errorSummary.totalErrors);
        console.log('Performance Score:', performanceMonitor.getPerformanceScore());
        console.groupEnd();
      }
    }, 30000);
  }
}

/**
 * Получает полный отчет о состоянии системы
 */
export function getMonitoringReport() {
  return {
    api: apiMetricsCollector.getSummary(),
    errors: errorLogger.getSummary(),
    performance: {
      metrics: performanceMonitor.getMetrics(),
      score: performanceMonitor.getPerformanceScore(),
    },
    timestamp: Date.now(),
  };
}

/**
 * Экспортирует все данные мониторинга
 */
export function exportMonitoringData(): string {
  return JSON.stringify({
    api: apiMetricsCollector.exportMetrics(),
    errors: errorLogger.exportErrors(),
    performance: performanceMonitor.generateReport(),
    timestamp: Date.now(),
  }, null, 2);
}

// Экспортируем готовые интерцепторы для интеграции
export { createMetricsInterceptor };

