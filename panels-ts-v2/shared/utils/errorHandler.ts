/**
 * Централизованная обработка ошибок
 */

import { isNetworkError, isRetryableError } from './retryUtils';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  status?: number;
  isNetworkError: boolean;
  isRetryable: boolean;
  isOffline: boolean;
  originalError?: any;
}

/**
 * Нормализует ошибку в стандартный формат
 */
export function normalizeError(error: any): ErrorInfo {
  const info: ErrorInfo = {
    message: 'Произошла неизвестная ошибка',
    isNetworkError: isNetworkError(error),
    isRetryable: isRetryableError(error),
    isOffline: false,
    originalError: error,
  };
  
  // Проверяем офлайн статус
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    info.isOffline = !navigator.onLine;
  }
  
  // Обрабатываем Axios ошибки
  if (error?.response) {
    const response = error.response;
    info.status = response.status;
    info.code = response.status;
    
    const data = response.data;
    
    if (data?.detail) {
      info.message = typeof data.detail === 'string' 
        ? data.detail 
        : JSON.stringify(data.detail);
    } else if (data?.message) {
      info.message = data.message;
    } else if (data?.error) {
      info.message = data.error;
    } else {
      // Стандартные сообщения по статусу
      switch (response.status) {
        case 400:
          info.message = 'Неверный запрос. Проверьте введенные данные.';
          break;
        case 401:
          info.message = 'Требуется авторизация. Пожалуйста, войдите в систему.';
          break;
        case 403:
          info.message = 'Доступ запрещен. У вас нет прав для выполнения этого действия.';
          break;
        case 404:
          info.message = 'Ресурс не найден.';
          break;
        case 422:
          info.message = 'Ошибка валидации данных. Проверьте введенные данные.';
          break;
        case 429:
          info.message = 'Слишком много запросов. Пожалуйста, подождите немного.';
          break;
        case 500:
          info.message = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
          break;
        case 502:
          info.message = 'Сервер временно недоступен. Попробуйте позже.';
          break;
        case 503:
          info.message = 'Сервис временно недоступен. Попробуйте позже.';
          break;
        case 504:
          info.message = 'Превышено время ожидания ответа. Попробуйте позже.';
          break;
        default:
          info.message = `Ошибка сервера (${response.status}).`;
      }
    }
  }
  // Обрабатываем сетевые ошибки
  else if (error?.request) {
    info.message = info.isOffline
      ? 'Нет подключения к интернету. Проверьте ваше соединение.'
      : 'Не удалось подключиться к серверу. Проверьте, что сервер запущен.';
    info.code = 'NETWORK_ERROR';
  }
  // Обрабатываем ошибки таймаута
  else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    info.message = 'Превышено время ожидания. Попробуйте позже.';
    info.code = 'TIMEOUT';
    info.isRetryable = true;
  }
  // Обрабатываем обычные ошибки
  else if (error?.message) {
    info.message = error.message;
    info.code = error.code || 'UNKNOWN_ERROR';
  }
  
  return info;
}

/**
 * Получает понятное сообщение об ошибке для пользователя
 */
export function getUserFriendlyMessage(error: any): string {
  const info = normalizeError(error);
  return info.message;
}

/**
 * Проверяет, нужно ли перенаправлять на страницу входа
 */
export function shouldRedirectToLogin(error: any): boolean {
  const info = normalizeError(error);
  return info.status === 401;
}

/**
 * Логирует ошибку в консоль с подробной информацией
 */
export function logError(error: any, context?: string): void {
  const info = normalizeError(error);
  
  const logMessage = context 
    ? `[${context}] ${info.message}`
    : info.message;
  
  console.error(logMessage, {
    status: info.status,
    code: info.code,
    isNetworkError: info.isNetworkError,
    isRetryable: info.isRetryable,
    isOffline: info.isOffline,
    originalError: info.originalError,
  });
}

