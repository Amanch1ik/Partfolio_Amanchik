import axios, { AxiosInstance, AxiosError } from 'axios';
// Типы для _retryCount определены в src/types/axios.d.ts и подхватываются автоматически
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from '@/types';
import { createMetricsInterceptor, errorLogger } from '@shared/monitoring';
import { getUserFriendlyMessage, logError, shouldRedirectToLogin } from '@shared/utils/errorHandler';
import { createRetryInterceptor, isRetryableError } from '@shared/utils/retryUtils';

// В development можем явно задать полный URL через VITE_API_URL (например, внешний стенд),
// В production всегда используем относительный путь и прокси (nginx).
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;
const ENV_API_BASE = import.meta.env.VITE_API_URL || '';

// В production всегда используем относительный путь, игнорируя VITE_API_URL
const API_PATH = IS_PROD
  ? '/api/v1'
  : (IS_DEV && ENV_API_BASE ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1` : '/api/v1');

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_PATH,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд таймаут по умолчанию для всех запросов
});

// Создаем интерцептор метрик для отслеживания API запросов
const metricsInterceptor = createMetricsInterceptor();

// Создаем retry interceptor для автоматических повторов
const retryInterceptor = createRetryInterceptor({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxRetryDelay: 30000,
});

// Интерцептор для добавления токена и метрик
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Инициализируем счетчик попыток
    if (!config._retryCount) {
      config._retryCount = 0;
    }
    // Добавляем отслеживание метрик
    return metricsInterceptor.request(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок и метрик
apiClient.interceptors.response.use(
  (response) => {
    // Записываем метрики успешного ответа
    metricsInterceptor.response(response);
    // Сбрасываем счетчик попыток при успехе
    if (response.config) {
      response.config._retryCount = 0;
    }
    return response;
  },
  async (error: AxiosError) => {
    // Пытаемся повторить запрос через retry interceptor
    if (isRetryableError(error) && error.config) {
      try {
        const retryResult = await retryInterceptor.onRejected(error);
        if (retryResult) {
          return retryResult;
        }
      } catch (retryError) {
        // Если retry не помог, продолжаем обычную обработку ошибки
      }
    }
    // Расширенная обработка ошибок
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      // Логируем ошибку в систему мониторинга (кроме 429 - это нормальная ситуация)
      if (status !== 429) {
        errorLogger.logApiError(
          error.config?.url || '',
          status,
          error
        );
      }
      
      switch (status) {
        case 401:
          // Токен истек или невалиден
          localStorage.removeItem('admin_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          console.error('Ошибка авторизации:', data?.detail || 'Unauthorized');
          break;
        case 403:
          console.error('Доступ запрещен:', data?.detail || 'Forbidden');
          break;
        case 404:
          console.error('Ресурс не найден:', data?.detail || 'Not Found');
          break;
        case 422:
          console.error('Ошибка валидации:', data?.detail || 'Validation Error');
          break;
        case 429:
          // Rate limit - слишком много запросов
          console.warn('Превышен лимит запросов. Подождите немного.');
          // Не логируем как ошибку, это нормальная ситуация
          break;
        case 500: {
          const errorMsg = data?.detail || data?.message || 'Internal Server Error';
          // Логируем только один раз, чтобы не засорять консоль
          if (!(error.config as any)?._500Logged) {
            console.error('⚠️ Ошибка сервера (500):', errorMsg);
            console.warn('💡 Backend возвращает ошибки 500. Проверьте логи сервера.');
            (error.config as any)._500Logged = true;
          }
          break;
        }
        case 503:
          console.error('Сервис недоступен:', data?.detail || 'Service Unavailable');
          break;
        default:
          console.error('Ошибка API:', data?.detail || error.message);
      }
    } else if (error.request) {
      // Запрос отправлен, но ответа нет - логируем как сетевую ошибку
      errorLogger.logError({
        message: `Network Error: No response from server - ${error.config?.url || 'unknown'}`,
        source: 'api',
        additionalData: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });
      
      console.error('Нет ответа от сервера. Проверьте подключение к бэкенду.');
    } else {
      // Ошибка при настройке запроса
      errorLogger.logError({
        message: `Request Error: ${error.message}`,
        source: 'api',
        additionalData: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });
      console.error('Ошибка запроса:', error.message);
    }
    
    // Записываем метрики ошибки
    return metricsInterceptor.error(error);
  }
);

// Типы для ответов API
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  // Для некоторых страниц используется total_pages
  total_pages?: number;
}

// Admin API методы
const adminApi = {
  // Аутентификация
  async login(username: string, password: string) {
    // Определяем, является ли введенное значение email или username
    const isEmail = username.includes('@');
    const loginData = isEmail 
      ? { email: username, password: password }
      : { username: username, password: password };
    
    // Проверяем, что пароль не пустой
    if (!password || password.trim() === '') {
      throw new Error('Пароль не может быть пустым');
    }
    
    try {
      // Роутер админа имеет префикс /admin, поэтому путь /admin/auth/login
      const loginUrl = `${API_PATH}/admin/auth/login`;
      console.log('📡 adminApi.login: Отправляем запрос на', loginUrl);
      console.log('📦 Данные запроса:', JSON.stringify(loginData, null, 2));
      // Используем admin login endpoint
      const response = await axios.post(loginUrl, loginData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      if (response.data.access_token) {
        console.log('💾 adminApi.login: Сохраняем токен в localStorage');
        localStorage.setItem('admin_token', response.data.access_token);
        return {
          access_token: response.data.access_token,
          admin: response.data.admin || {
            id: '1',
            email: username,
            role: 'admin' as const,
          },
        };
      }
      throw new Error('Invalid response: no access_token');
    } catch (error: any) {
      // Обрабатываем ошибки подключения
      if (!error.response && error.request) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('Превышено время ожидания. Проверьте подключение к интернету.');
        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
          throw new Error(`Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 8001`);
        } else {
          throw new Error(`Не удалось подключиться к серверу. Проверьте, что бэкенд запущен на порту 8001`);
        }
      }
      throw error; // Возвращаем ошибку для обработки в LoginPage
    }
  },

  logout() {
    localStorage.removeItem('admin_token');
  },

  async getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
    const response = await apiClient.get('/admin/me');
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/auth/me');
      // Безопасная обработка ответа
      if (!response || !response.data) {
        throw new Error('Invalid response format');
      }
      return response.data;
    } catch (error: any) {
      // При ошибке 401 или 403 возвращаем пустой ответ вместо падения
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error; // Пробрасываем для обработки в интерцепторе
      }
      // Для других ошибок возвращаем безопасный ответ
      // Не логируем ошибки 500 здесь - они уже обработаны в интерцепторе
      if (error.response?.status !== 500) {
        console.error('Error getting current user:', error);
      }
      throw error;
    }
  },

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await apiClient.get('/admin/dashboard/stats');
      // Безопасная обработка ответа
      if (!response || !response.data) {
        console.warn('⚠️ getDashboardStats: Пустой ответ от API');
        return {
          data: {
            total_users: 0,
            active_users: 0,
            total_partners: 0,
            active_partners: 0,
            total_transactions: 0,
            total_revenue: 0,
            transactions_today: 0,
            revenue_today: 0,
            users_growth: 0,
            revenue_growth: 0,
          } as DashboardStats,
        };
      }
      // Проверяем структуру данных перед возвратом
      const statsData = response.data?.data || response.data;
      return {
        data: {
          total_users: statsData?.total_users ?? 0,
          active_users: statsData?.active_users ?? 0,
          total_partners: statsData?.total_partners ?? 0,
          active_partners: statsData?.active_partners ?? statsData?.total_partners ?? 0,
          total_transactions: statsData?.total_transactions ?? 0,
          total_revenue: statsData?.total_revenue ?? 0,
          transactions_today: statsData?.transactions_today ?? 0,
          revenue_today: statsData?.revenue_today ?? 0,
          users_growth: statsData?.users_growth ?? 0,
          revenue_growth: statsData?.revenue_growth ?? 0,
        } as DashboardStats,
      };
    } catch (error: any) {
      // Не логируем ошибки 500 - они уже обработаны в интерцепторе
      if (error.response?.status !== 500) {
        console.error('❌ getDashboardStats: Ошибка получения статистики:', error);
      }
      // Возвращаем безопасные значения по умолчанию вместо падения
      return {
        data: {
          total_users: 0,
          active_users: 0,
          total_partners: 0,
          active_partners: 0,
          total_transactions: 0,
          total_revenue: 0,
          transactions_today: 0,
          revenue_today: 0,
          users_growth: 0,
          revenue_growth: 0,
        } as DashboardStats,
      };
    }
  },

  // Users
  async getUsers(page = 1, page_size = 20, search?: string): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      const params: any = { page, page_size };
      if (search && search.trim()) {
        params.search = search.trim();
      }
      const response = await apiClient.get('/admin/users', { 
        params,
        timeout: 20000, // 20 секунд для получения списка пользователей
      });
      // Безопасная обработка ответа
      if (!response || !response.data) {
        return {
          data: {
            items: [],
            total: 0,
            page,
            page_size,
          },
        };
      }
      return response.data;
    } catch (error: any) {
      console.error('Error fetching users:', error);
      // Возвращаем безопасный ответ вместо падения
      return {
        data: {
          items: [],
          total: 0,
          page,
          page_size,
        },
      };
    }
  },

  async getUserById(id: number): Promise<ApiResponse<User>> {
    try {
      if (!id || typeof id !== 'number') {
        throw new Error('Invalid user ID');
      }
      const response = await apiClient.get(`/admin/users/${id}`, {
        timeout: 15000,
      });
      if (!response || !response.data) {
        throw new Error('Invalid response format');
      }
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  async updateUser(id: number, data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      if (!id || typeof id !== 'number') {
        throw new Error('Invalid user ID');
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid user data');
      }
      const response = await apiClient.put(`/admin/users/${id}`, data, {
        timeout: 15000,
      });
      if (!response || !response.data) {
        throw new Error('Invalid response format');
      }
      return response.data;
    } catch (error: any) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  async activateUser(id: number): Promise<void> {
    await apiClient.post(`/admin/users/${id}/activate`);
  },

  async deactivateUser(id: number): Promise<void> {
    await apiClient.post(`/admin/users/${id}/deactivate`);
  },

  // Partners
  async getPartners(page = 1, page_size = 20, search?: string, status?: string): Promise<ApiResponse<PaginatedResponse<Partner>>> {
    try {
      const params: any = { page, page_size };
      if (search && search.trim()) {
        params.search = search.trim();
      }
      if (status) {
        params.status = status;
      }
      const response = await apiClient.get('/admin/partners', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching partners:', error);
      return {
        data: {
          items: [],
          total: 0,
          page,
          page_size,
        },
      };
    }
  },

  async getPartnerById(id: number): Promise<ApiResponse<Partner>> {
    const response = await apiClient.get(`/admin/partners/${id}`);
    return response.data;
  },

  // Partner Locations (Admin)
  async getPartnerLocations(): Promise<ApiResponse<any[]>> {
    // Backend endpoint для локаций партнёров пока нестабилен,
    // поэтому в панели просто возвращаем пустой список, чтобы не спамить ошибками.
    return { data: [] };
  },

  async createPartnerLocation(partnerId: number, data: { address: string; latitude: number; longitude: number; phone_number?: string; is_active?: boolean }): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`/admin/partners/${partnerId}/locations`, data);
    return response.data;
  },

  async deletePartnerLocation(locationId: number): Promise<void> {
    await apiClient.delete(`/admin/partners/locations/${locationId}`);
  },

  async createPartner(data: Partial<Partner>): Promise<ApiResponse<Partner>> {
    const response = await apiClient.post('/admin/partners', data);
    return response.data;
  },

  async updatePartner(id: number, data: Partial<Partner>): Promise<ApiResponse<Partner>> {
    const response = await apiClient.put(`/admin/partners/${id}`, data);
    return response.data;
  },

  async deletePartner(id: number): Promise<void> {
    await apiClient.delete(`/admin/partners/${id}`);
  },

  async approvePartner(id: number): Promise<void> {
    await apiClient.post(`/admin/partners/${id}/approve`);
  },

  async rejectPartner(id: number, reason?: string): Promise<void> {
    await apiClient.post(`/admin/partners/${id}/reject`, { reason });
  },

  // Promotions
  async getPromotions(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Promotion>>> {
    try {
      const response = await apiClient.get('/admin/promotions', {
        params: { page, page_size },
      });
      // Backend сейчас возвращает объект формата { items, total, page, page_size }
      const payload = response.data as any;
      const normalized: PaginatedResponse<Promotion> = {
        items: Array.isArray(payload?.items) ? payload.items : [],
        total: payload?.total ?? 0,
        page: payload?.page ?? page,
        page_size: payload?.page_size ?? page_size,
        total_pages: payload?.total_pages,
      };
      return { data: normalized };
    } catch {
      // В случае ошибки возвращаем пустой список, чтобы React Query не получал undefined
      return {
        data: {
          items: [],
          total: 0,
          page,
          page_size,
        },
      };
    }
  },

  async getPromotionById(id: number): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.get(`/admin/promotions/${id}`);
    return response.data;
  },

  async createPromotion(data: Partial<Promotion>): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.post('/admin/promotions', data);
    return response.data;
  },

  async updatePromotion(id: number, data: Partial<Promotion>): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.put(`/admin/promotions/${id}`, data);
    return response.data;
  },

  async deletePromotion(id: number): Promise<void> {
    await apiClient.delete(`/admin/promotions/${id}`);
  },

  // Transactions
  async getTransactions(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    try {
      const response = await apiClient.get('/admin/transactions', {
        params: { page, page_size },
        timeout: 15000, // 15 секунд таймаут
      });
      // Безопасная обработка ответа
      if (!response || !response.data) {
        return {
          data: {
            items: [],
            total: 0,
            page,
            page_size,
          },
        };
      }
      const payload = response.data as any;
      const normalized: PaginatedResponse<Transaction> = {
        items: Array.isArray(payload?.items) ? payload.items : [],
        total: payload?.total ?? 0,
        page: payload?.page ?? page,
        page_size: payload?.page_size ?? page_size,
        total_pages: payload?.total_pages,
      };
      return { data: normalized };
    } catch (error: any) {
      // Не логируем ошибки 500 - они уже обработаны в интерцепторе
      if (error.response?.status !== 500) {
        console.error('Error fetching transactions:', error);
      }
      // Возвращаем безопасный ответ вместо падения
      return {
        data: {
          items: [],
          total: 0,
          page,
          page_size,
        },
      };
    }
  },

  async getTransactionById(id: number): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data;
  },

  // Notifications
  async getNotifications(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await apiClient.get('/admin/notifications', {
        params: { page, page_size },
      });
      return response.data;
    } catch {
      // Возвращаем пустые чтобы страница использовала демо-данные
      return {
        data: {
          items: [],
          total: 0,
          page,
          page_size,
        },
      };
    }
  },

  async sendNotification(data: {
    title: string;
    message: string;
    segment: string;
    scheduled_for?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/admin/notifications', data);
    return response.data;
  },

  async updateNotification(id: number, data: Partial<any>): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/admin/notifications/${id}`, data);
    return response.data;
  },

  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/admin/notifications/${id}`);
  },

  // Referrals
  async getReferrals(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/referrals');
    return response.data;
  },

  async getReferralsStats(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/referrals/stats');
    return response.data;
  },

  // Audit - backend эндпоинты пока не реализованы,
  // поэтому возвращаем пустые данные без сетевых запросов.
  async getAuditLogs(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await apiClient.get('/admin/audit/logs', {
      params: { page, page_size },
    });
    return response.data;
  },

  async getAuditSessions(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/audit/sessions');
    return response.data;
  },

  // Settings
  async getSettings(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  async updateSettings(data: Partial<any>): Promise<ApiResponse<any>> {
    const response = await apiClient.put('/admin/settings', data);
    return response.data;
  },

  async getCategories(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/settings/categories');
    return response.data;
  },

  async createCategory(data: { name: string }): Promise<ApiResponse<any>> {
    const payload = { Name: data.name ?? data?.['Name'] ?? data?.['name'] };
    const response = await apiClient.post('/admin/settings/categories', payload);
    return response.data;
  },

  async updateCategory(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    const payload = { Name: data.name ?? data?.['Name'] ?? data?.['name'] };
    const response = await apiClient.put(`/admin/settings/categories/${id}`, payload);
    return response.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/admin/settings/categories/${id}`);
  },

  async getCities(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/cities');
    return response.data;
  },

  async createCity(data: { name: string; country?: string }): Promise<ApiResponse<any>> {
    const payload = {
      Name: data.name ?? data?.['Name'] ?? data?.['name'],
      Country: data.country ?? data?.['Country'],
    };
    const response = await apiClient.post('/admin/cities', payload);
    return response.data;
  },

  async updateCity(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    const payload = { Name: data.name ?? data?.['Name'] ?? data?.['name'] };
    const response = await apiClient.put(`/admin/settings/cities/${id}`, payload);
    return response.data;
  },

  async deleteCity(id: number): Promise<void> {
    await apiClient.delete(`/admin/settings/cities/${id}`);
  },

  async getLimits(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/settings/limits');
    return response.data;
  },

  async updateLimits(data: Record<string, any>): Promise<ApiResponse<any>> {
    const response = await apiClient.put('/admin/settings/limits', data);
    return response.data;
  },

  async getApiKeys(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/settings/api-keys');
    return response.data;
  },

  async createApiKey(data: { name: string }): Promise<ApiResponse<any>> {
    const payload = { Name: data.name ?? data?.['Name'] ?? data?.['name'] };
    const response = await apiClient.post('/admin/settings/api-keys', payload);
    return response.data;
  },

  async revokeApiKey(id: number): Promise<void> {
    await apiClient.delete(`/admin/settings/api-keys/${id}`);
  },

  // File Upload
  async uploadPartnerLogo(partnerId: number, file: File): Promise<ApiResponse<{ logo_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/upload/partner/logo/${partnerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadPartnerCover(partnerId: number, file: File): Promise<ApiResponse<{ cover_image_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/upload/partner/cover/${partnerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default adminApi;
export type { ApiResponse, PaginatedResponse };

