/**
 * Централизованная система логирования ошибок
 * Собирает и отслеживает все ошибки в приложении
 */

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  source: 'api' | 'react' | 'javascript' | 'promise';
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySource: Record<string, number>;
  recentErrors: ErrorLog[];
  criticalErrors: ErrorLog[];
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private maxErrorsCount = 500; // Храним последние 500 ошибок
  private readonly storageKey = 'error_logs';
  private readonly enabled: boolean;
  private errorHandlers: Array<(error: ErrorLog) => void> = [];

  constructor() {
    this.enabled = import.meta.env.VITE_ENABLE_ERROR_LOGGING !== 'false';
    
    if (this.enabled) {
      this.initializeGlobalHandlers();
      this.loadFromStorage();
    }
  }

  /**
   * Инициализирует глобальные обработчики ошибок
   */
  private initializeGlobalHandlers(): void {
    // Обработка JavaScript ошибок
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        source: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      } as any);
    });

    // Обработка необработанных промисов
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      this.logError({
        message: error?.message || 'Unhandled promise rejection',
        stack: error?.stack,
        source: 'promise',
        additionalData: { reason: error },
      } as any);
    });
  }

  /**
   * Логирует ошибку
   */
  logError(error: Partial<ErrorLog> & { message: string; source: ErrorLog['source'] }): void {
    if (!this.enabled) return;

    // Фильтруем известные незначительные ошибки
    if (this.shouldIgnoreError(error)) {
      return;
    }

    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      source: error.source,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      additionalData: error.additionalData,
    };

    this.errors.push(errorLog);

    // Ограничиваем количество ошибок
    if (this.errors.length > this.maxErrorsCount) {
      this.errors.shift();
    }

    // Вызываем зарегистрированные обработчики
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorLog);
      } catch (e) {
        console.warn('Error in error handler:', e);
      }
    });

    // Периодически сохраняем в localStorage
    if (this.errors.length % 20 === 0) {
      this.saveToStorage();
    }

    // В development выводим в консоль (но не для каждой ошибки 500, чтобы не засорять)
    if (import.meta.env.DEV) {
      // Для ошибок 500 логируем только каждую 10-ю, чтобы не засорять консоль
      if (errorLog.additionalData?.status === 500) {
        const error500Count = this.errors.filter(e => e.additionalData?.status === 500).length;
        if (error500Count % 10 === 0 || error500Count === 1) {
          console.warn(`⚠️ Ошибка 500 (всего: ${error500Count}):`, errorLog.message);
        }
      } else {
        console.error('🚨 Error logged:', errorLog);
      }
    }
  }

  /**
   * Логирует API ошибку
   */
  logApiError(url: string, status: number, error: any): void {
    this.logError({
      message: `API Error: ${status} - ${url}`,
      source: 'api',
      additionalData: {
        url,
        status,
        error: error?.response?.data || error?.message,
      },
    });
  }

  /**
   * Логирует React ошибку
   */
  logReactError(error: Error, errorInfo?: any): void {
    this.logError({
      message: error.message,
      stack: error.stack,
      source: 'react',
      additionalData: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  /**
   * Получает сводку ошибок
   */
  getSummary(timeWindow?: number): ErrorSummary {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantErrors = windowStart > 0
      ? this.errors.filter(e => e.timestamp >= windowStart)
      : this.errors;

    const errorsByType: Record<string, number> = {};
    const errorsBySource: Record<string, number> = {};
    const criticalErrors: ErrorLog[] = [];

    relevantErrors.forEach(error => {
      // Группировка по типу (извлекаем из сообщения)
      const type = this.extractErrorType(error.message);
      errorsByType[type] = (errorsByType[type] || 0) + 1;

      // Группировка по источнику
      errorsBySource[error.source] = (errorsBySource[error.source] || 0) + 1;

      // Критические ошибки (5xx, network errors, etc)
      if (this.isCriticalError(error)) {
        criticalErrors.push(error);
      }
    });

    return {
      totalErrors: relevantErrors.length,
      errorsByType,
      errorsBySource,
      recentErrors: relevantErrors.slice(-20), // Последние 20 ошибок
      criticalErrors: criticalErrors.slice(-10), // Последние 10 критических
    };
  }

  /**
   * Получает ошибки за последние N минут
   */
  getRecentErrors(minutes: number = 5): ErrorSummary {
    return this.getSummary(minutes * 60 * 1000);
  }

  /**
   * Регистрирует обработчик ошибок
   */
  onError(handler: (error: ErrorLog) => void): () => void {
    this.errorHandlers.push(handler);
    
    // Возвращаем функцию для отмены подписки
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Очищает все ошибки
   */
  clear(): void {
    this.errors = [];
    this.saveToStorage();
  }

  /**
   * Получает все ошибки (для экспорта)
   */
  getAllErrors(): ErrorLog[] {
    return [...this.errors];
  }

  /**
   * Экспортирует ошибки в JSON
   */
  exportErrors(): string {
    const summary = this.getSummary();
    const exportData = {
      summary,
      errors: this.errors.slice(-100), // Последние 100 ошибок
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Извлекает тип ошибки из сообщения
   */
  private extractErrorType(message: string): string {
    if (message.includes('API Error')) return 'API Error';
    if (message.includes('Network')) return 'Network Error';
    if (message.includes('Timeout')) return 'Timeout';
    if (message.includes('401') || message.includes('Unauthorized')) return 'Authentication';
    if (message.includes('404') || message.includes('Not Found')) return 'Not Found';
    if (message.includes('500') || message.includes('Server Error')) return 'Server Error';
    return 'Other';
  }

  /**
   * Проверяет, является ли ошибка критической
   */
  private isCriticalError(error: ErrorLog): boolean {
    // API ошибки 5xx
    if (error.source === 'api' && error.additionalData?.status >= 500) {
      return true;
    }
    
    // Сетевые ошибки
    if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
      return true;
    }

    // Ошибки в критических компонентах
    if (error.source === 'react') {
      return true;
    }

    return false;
  }

  /**
   * Проверяет, нужно ли игнорировать ошибку
   */
  private shouldIgnoreError(error: Partial<ErrorLog>): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Игнорируем известные незначительные ошибки
    const ignoredPatterns = [
      'attachshadow',
      'websocket connection',
      'script error',
      'resizeobserver loop',
      'non-error promise rejection',
    ];

    return ignoredPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Получает ID пользователя
   */
  private getUserId(): string | undefined {
    try {
      const adminUser = localStorage.getItem('admin_user');
      const partnerUser = localStorage.getItem('partner_user');
      
      if (adminUser) {
        const user = JSON.parse(adminUser);
        return user.id;
      }
      
      if (partnerUser) {
        const user = JSON.parse(partnerUser);
        return user.id;
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
    
    return undefined;
  }

  /**
   * Сохраняет ошибки в localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        errors: this.errors.slice(-50), // Сохраняем только последние 50
        timestamp: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save errors to storage:', error);
    }
  }

  /**
   * Загружает ошибки из localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Загружаем только если данные не старше 24 часов
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (data.timestamp && data.timestamp > oneDayAgo && data.errors) {
          this.errors = data.errors;
        }
      }
    } catch (error) {
      console.warn('Failed to load errors from storage:', error);
    }
  }
}

// Singleton экземпляр
export const errorLogger = new ErrorLogger();

