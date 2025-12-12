/**
 * Утилиты для безопасной валидации и обработки ответов API
 */

/**
 * Безопасно извлекает данные из ответа API
 */
export function safeGetData<T>(response: any, fallback: T): T {
  if (!response) return fallback;
  
  // Если это уже данные нужного типа
  if (typeof response === 'object' && !Array.isArray(response) && !response.data) {
    return response as T;
  }
  
  // Если есть вложенная структура { data: ... }
  if (response?.data) {
    return response.data as T;
  }
  
  return fallback;
}

/**
 * Безопасно извлекает массив из ответа API
 */
export function safeGetArray<T>(response: any, fallback: T[] = []): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response?.data) {
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response.data.items)) {
      return response.data.items;
    }
  }
  
  if (response?.items && Array.isArray(response.items)) {
    return response.items;
  }
  
  return fallback;
}

/**
 * Валидирует структуру ответа API
 */
export function validateApiResponse(response: any): boolean {
  if (!response) return false;
  if (typeof response !== 'object') return false;
  return true;
}

/**
 * Безопасно извлекает вложенные поля из объекта
 */
export function safeGet<T>(obj: any, path: string, fallback: T): T {
  if (!obj || typeof obj !== 'object') return fallback;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return fallback;
    if (typeof current !== 'object') return fallback;
    current = current[key];
  }
  
  return current !== undefined && current !== null ? (current as T) : fallback;
}

