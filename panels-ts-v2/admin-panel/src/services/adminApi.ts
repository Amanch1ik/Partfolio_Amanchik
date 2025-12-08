import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from '@/types';
import { createMetricsInterceptor, errorLogger } from '../../../shared/monitoring';
import { getUserFriendlyMessage, logError, shouldRedirectToLogin } from '../../../shared/utils/errorHandler';

// Базовый URL backend'a. Если задан VITE_API_URL, используем его (напр. https://api.yessgo.org),
// иначе работаем через относительный путь и Vite/nginx proxy.
const IS_DEV = import.meta.env.DEV;
const ENV_API_BASE = import.meta.env.VITE_API_URL || '';

const API_PATH = ENV_API_BASE
  ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

// Demo‑режим: используем мок‑данные и не падаем, если backend недоступен
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_PATH,
  headers: {
    'Content-Type': 'application/json',
  },
  // В разработке уменьшаем таймаут, чтобы UI не «подвисал» долго при неработающем бэкенде
  timeout: IS_DEV ? 5000 : 30000,
});

// Создаем интерцептор метрик для отслеживания API запросов
const metricsInterceptor = createMetricsInterceptor();

// Интерцептор для добавления токена и метрик
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    return response;
  },
  (error: AxiosError) => {
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
          console.error('Ошибка сервера:', errorMsg);
          // Показываем пользователю понятное сообщение
          if (errorMsg.includes('DateTime') || errorMsg.includes('timestamp')) {
            console.error('⚠️ Проблема с форматом даты. Убедитесь, что бэкенд обновлен с исправлениями DateTime.');
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

// Простейшее in-memory хранилище для dev-настроек,
// пока соответствующие endpoints на бэкенде не реализованы.
// Это позволяет странице настроек работать без 404 и падений.
const devSettingsStore: {
  categories: { id: number; name: string }[];
  limits: Record<string, any>;
  apiKeys: { id: number; name: string; key: string; created_at: string }[];
} = {
  categories: [],
  limits: {},
  apiKeys: [],
};

let devCategoryId = 1;
let devApiKeyId = 1;

// Admin API методы
const adminApi = {
  // Аутентификация
  async login(username: string, password: string) {
    // В demo‑режиме не ходим на сервер вообще
    if (DEMO_MODE) {
      const demoToken = 'demo-admin-token';
      localStorage.setItem('admin_token', demoToken);
      return {
        access_token: demoToken,
        admin: {
          id: 'demo-admin',
          email: username || 'admin@yessgo.org',
          role: 'admin' as const,
        },
      };
    }
    try {
      console.log('📡 adminApi.login: Отправляем запрос на', `${API_PATH}/auth/login`);
      // Пробуем использовать JSON endpoint аутентификации
      const response = await axios.post(`${API_PATH}/auth/login/json`, {
        phone: username,
        password: password,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.access_token) {
        localStorage.setItem('admin_token', response.data.access_token);
        return {
          access_token: response.data.access_token,
          admin: response.data.user || {
            id: response.data.user?.id?.toString() || '1',
            email: username,
            role: 'admin' as const,
          },
        };
      }
      throw new Error('Invalid response');
    } catch (error: any) {
      // Для тестирования используем обычный login endpoint
      try {
        const response = await axios.post(`${API_PATH}/auth/login`, {
          phone: username,
          password,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        if (response.data.access_token) {
          console.log('💾 adminApi.login: Сохраняем токен в localStorage');
          localStorage.setItem('admin_token', response.data.access_token);
          return {
            access_token: response.data.access_token,
            admin: {
              id: '1',
              email: username,
              role: 'admin' as const,
            },
          };
        }
      } catch (adminError: any) {
        // Обрабатываем ошибки подключения
        if (!adminError.response && adminError.request) {
          if (adminError.code === 'ECONNABORTED' || adminError.message?.includes('timeout')) {
            throw new Error('Превышено время ожидания. Проверьте подключение к интернету.');
          } else if (adminError.code === 'ERR_NETWORK' || adminError.message?.includes('Network Error') || adminError.message?.includes('Failed to fetch')) {
            throw new Error(`Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на порту 8000`);
          } else {
            throw new Error(`Не удалось подключиться к серверу. Проверьте, что бэкенд запущен на порту 8000`);
          }
        }
        throw adminError; // Возвращаем ошибку admin endpoint
      }
      throw error;
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
      console.error('Error getting current user:', error);
      throw error;
    }
  },

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    // В demo‑режиме возвращаем статичные, но «живые» данные без запроса к API
    if (DEMO_MODE) {
      return {
        data: {
          total_users: 12450,
          active_users: 8732,
          total_partners: 215,
          total_transactions: 98234,
          total_revenue: 1250000,
          transactions_today: 345,
          revenue_today: 18450,
        } as DashboardStats,
      };
    }
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
            total_transactions: 0,
            total_revenue: 0,
            transactions_today: 0,
            revenue_today: 0,
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
          total_transactions: statsData?.total_transactions ?? 0,
          total_revenue: statsData?.total_revenue ?? 0,
          transactions_today: statsData?.transactions_today ?? 0,
          revenue_today: statsData?.revenue_today ?? 0,
        } as DashboardStats,
      };
    } catch (error: any) {
      console.error('❌ getDashboardStats: Ошибка получения статистики:', error);
      // Возвращаем безопасные значения по умолчанию вместо падения
      return {
        data: {
          total_users: 0,
          active_users: 0,
          total_partners: 0,
          total_transactions: 0,
          total_revenue: 0,
          transactions_today: 0,
          revenue_today: 0,
        } as DashboardStats,
      };
    }
  },

  // Users
  async getUsers(page = 1, page_size = 20, search?: string): Promise<ApiResponse<PaginatedResponse<User>>> {
    // Demo‑режим: возвращаем список фиктивных пользователей
    if (DEMO_MODE) {
      const items: User[] = [
        {
          id: 1,
          email: 'user1@yessgo.org',
          phone: '+996500000001',
          status: 'active',
          created_at: new Date().toISOString(),
        } as any,
        {
          id: 2,
          email: 'user2@yessgo.org',
          phone: '+996500000002',
          status: 'blocked',
          created_at: new Date().toISOString(),
        } as any,
      ];
      return {
        data: {
          items,
          total: items.length,
          page,
          page_size,
        },
      };
    }
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
    if (DEMO_MODE) {
      const items: Partner[] = [
        {
          id: 1,
          name: 'Demo Coffee',
          city: 'Бишкек',
          status: 'active',
        } as any,
        {
          id: 2,
          name: 'Demo Market',
          city: 'Ош',
          status: 'pending',
        } as any,
      ];
      return {
        data: {
          items,
          total: items.length,
          page,
          page_size,
        },
      };
    }
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
    if (DEMO_MODE) {
      const items: Promotion[] = [
        {
          id: 1,
          title: 'Скидка 10% на кофе',
          is_active: true,
        } as any,
        {
          id: 2,
          title: 'Бонусные Yess!Coin за покупки',
          is_active: false,
        } as any,
      ];
      return {
        data: {
          items,
          total: items.length,
          page,
          page_size,
        },
      };
    }
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
    if (DEMO_MODE) {
      const items: Transaction[] = [
        {
          id: 1,
          amount: 150,
          created_at: new Date().toISOString(),
          status: 'completed',
        } as any,
        {
          id: 2,
          amount: 320,
          created_at: new Date().toISOString(),
          status: 'completed',
        } as any,
      ];
      return {
        data: {
          items,
          total: items.length,
          page,
          page_size,
        },
      };
    }
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
      console.error('Error fetching transactions:', error);
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
    if (DEMO_MODE) {
      const items = [
        {
          id: 1,
          title: 'Добро пожаловать в Yess!Admin',
          message: 'Это демо‑режим панели управления.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      return {
        data: {
          items,
          total: items.length,
          page,
          page_size,
        },
      };
    }
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
    if (DEMO_MODE) {
      return {
        data: [
          { id: 1, inviter: 'Demo User', invited: 5 },
        ],
      };
    }
    const response = await apiClient.get('/admin/referrals');
    return response.data;
  },

  async getReferralsStats(): Promise<ApiResponse<any>> {
    if (DEMO_MODE) {
      return {
        data: {
          total_referrals: 42,
          active_referrals: 30,
        },
      };
    }
    const response = await apiClient.get('/admin/referrals/stats');
    return response.data;
  },

  // Audit - backend эндпоинты пока не реализованы,
  // поэтому возвращаем пустые данные без сетевых запросов.
  async getAuditLogs(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    return {
      data: {
        items: [],
        total: 0,
        page,
        page_size,
      },
    };
  },

  async getAuditSessions(): Promise<ApiResponse<any[]>> {
    return { data: [] };
  },

  // Settings
  async getSettings(): Promise<ApiResponse<any>> {
    // Возвращаем in-memory настройки, чтобы не обращаться к несуществующему endpoint
    return {
      data: {
        limits: devSettingsStore.limits,
        categories: devSettingsStore.categories,
        api_keys: devSettingsStore.apiKeys,
      },
    };
  },

  async updateSettings(data: Partial<any>): Promise<ApiResponse<any>> {
    devSettingsStore.limits = {
      ...devSettingsStore.limits,
      ...(data.limits || {}),
    };
    return { data: devSettingsStore.limits };
  },

  async getCategories(): Promise<ApiResponse<any[]>> {
    // Пока нет реального backend-API для категорий, работаем в памяти
    return { data: devSettingsStore.categories };
  },

  async createCategory(data: { name: string }): Promise<ApiResponse<any>> {
    const category = { id: devCategoryId++, name: data.name };
    devSettingsStore.categories.push(category);
    return { data: category };
  },

  async updateCategory(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    const idx = devSettingsStore.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      devSettingsStore.categories[idx] = { ...devSettingsStore.categories[idx], ...data };
      return { data: devSettingsStore.categories[idx] };
    }
    return { data: null };
  },

  async deleteCategory(id: number): Promise<void> {
    const idx = devSettingsStore.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      devSettingsStore.categories.splice(idx, 1);
    }
  },

  async getCities(): Promise<ApiResponse<any[]>> {
    // Используем реальные города из backend-эндпоинта /admin/cities
    const response = await apiClient.get('/admin/cities');
    const payload = response.data as any;
    // Приводим к массиву городов для удобства в UI
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return { data: items };
  },

  async createCity(data: { name: string; country?: string }): Promise<ApiResponse<any>> {
    // Проксируем создание в реальный endpoint /admin/cities
    const response = await apiClient.post('/admin/cities', { name: data.name });
    return { data: response.data };
  },

  async updateCity(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    // На бэкенде пока нет обновления города, поэтому просто возвращаем существующие данные как есть
    console.warn('updateCity не реализован на backend, операция пропущена');
    return { data: { id, ...data } };
  },

  async deleteCity(id: number): Promise<void> {
    await apiClient.delete(`/admin/cities/${id}`);
  },

  async getLimits(): Promise<ApiResponse<any>> {
    // Лимиты пока храним только в памяти
    return { data: devSettingsStore.limits };
  },

  async updateLimits(data: Record<string, any>): Promise<ApiResponse<any>> {
    devSettingsStore.limits = {
      ...devSettingsStore.limits,
      ...data,
    };
    return { data: devSettingsStore.limits };
  },

  async getApiKeys(): Promise<ApiResponse<any[]>> {
    return { data: devSettingsStore.apiKeys };
  },

  async createApiKey(data: { name: string }): Promise<ApiResponse<any>> {
    const key = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const apiKey = {
      id: devApiKeyId++,
      name: data.name,
      key,
      created_at: new Date().toISOString(),
    };
    devSettingsStore.apiKeys.push(apiKey);
    return { data: apiKey };
  },

  async revokeApiKey(id: number): Promise<void> {
    const idx = devSettingsStore.apiKeys.findIndex((k) => k.id === id);
    if (idx !== -1) {
      devSettingsStore.apiKeys.splice(idx, 1);
    }
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

