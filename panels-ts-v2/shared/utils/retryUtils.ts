/**
 * Утилиты для повторных попыток запросов
 */

// @ts-nocheck
import axios from 'axios';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
  exponentialBackoff?: boolean;
  maxRetryDelay?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error: any) => {
    // Повторяем только при сетевых ошибках или временных 5xx ошибках
    if (!error) return false;
    
    // Сетевые ошибки (нет ответа от сервера)
    if (error.request && !error.response) {
      return true;
    }
    
    // 5xx ошибки сервера - повторяем только 502, 503, 504 (временные)
    // 500 (Internal Server Error) не повторяем, так как это обычно постоянная ошибка
    if (error.response) {
      const status = error.response.status;
      // Повторяем только временные ошибки сервера
      if (status === 502 || status === 503 || status === 504) {
        return true;
      }
      // 500 не повторяем - это обычно постоянная ошибка
      if (status === 500) {
        return false;
      }
    }
    
    // Ошибки таймаута
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }
    
    return false;
  },
  exponentialBackoff: true,
  maxRetryDelay: 30000, // 30 секунд максимум
};

/**
 * Выполняет функцию с повторными попытками при ошибках
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Проверяем, нужно ли повторять
      if (!opts.retryCondition(error) || attempt >= opts.maxRetries) {
        throw error;
      }
      
      // Вычисляем задержку
      let delay = opts.retryDelay;
      if (opts.exponentialBackoff) {
        delay = Math.min(
          opts.retryDelay * Math.pow(2, attempt),
          opts.maxRetryDelay
        );
      }
      
      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Создает обертку для axios запроса с автоматическими повторами
 */
export function createRetryInterceptor(options: RetryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return {
    onRejected: async (error: any) => {
      // Не повторяем если уже были попытки
      if (error.config?._retryCount >= opts.maxRetries) {
        return Promise.reject(error);
      }
      
      // Проверяем условие для повтора
      if (!opts.retryCondition(error)) {
        return Promise.reject(error);
      }
      
      // Увеличиваем счетчик попыток
      const retryCount = (error.config._retryCount || 0) + 1;
      error.config._retryCount = retryCount;
      
      // Вычисляем задержку
      let delay = opts.retryDelay;
      if (opts.exponentialBackoff) {
        delay = Math.min(
          opts.retryDelay * Math.pow(2, retryCount - 1),
          opts.maxRetryDelay
        );
      }
      
      // Ждем перед повтором
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Повторяем запрос
      return axios(error.config);
    },
  };
}

/**
 * Проверяет, является ли ошибка сетевой ошибкой
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Axios сетевые ошибки
  if (error.request && !error.response) {
    return true;
  }
  
  // Ошибки таймаута
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Fetch API ошибки
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.message?.includes('Network request failed')) {
    return true;
  }
  
  return false;
}

/**
 * Проверяет, является ли ошибка временной (можно повторить)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Сетевые ошибки всегда повторяемы
  if (isNetworkError(error)) {
    return true;
  }
  
    // Временные 5xx ошибки сервера повторяемы
    if (error.response) {
      const status = error.response.status;
      
      // 502, 503, 504 - временные ошибки сервера (повторяем)
      if (status === 502 || status === 503 || status === 504) {
        return true;
      }
      
      // 500 - Internal Server Error (не повторяем, обычно постоянная ошибка)
      if (status === 500) {
        return false;
      }
      
      // 429 - слишком много запросов (повторяем через некоторое время)
      if (status === 429) {
        return true;
      }
      
      // 408 - Request Timeout
      if (status === 408) {
        return true;
      }
    }
  
  return false;
}

