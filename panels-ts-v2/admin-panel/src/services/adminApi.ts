import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from '@/types';
import { createMetricsInterceptor, errorLogger } from '@shared/monitoring';
import { createRetryInterceptor, isRetryableError } from '@shared/utils/retryUtils';

// Конфигурация API
const API_PATH = '/api/v1'; // Всегда используем относительный путь для проксирования

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_PATH,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Перехватчики для метрик и повторных попыток
const metricsInterceptor = createMetricsInterceptor();
const retryInterceptor = createRetryInterceptor({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxRetryDelay: 30000,
});

// Интерцептор запросов: добавление токена авторизации
apiClient.interceptors.request.use(
  (config) => {
    // Не добавляем токен для запросов входа и регистрации
    if (config.url?.includes('/admin/auth/login') || config.url?.includes('/admin/auth/register')) {
      return config;
    }

    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta.env.DEV) {
        console.log(`📡 [API Request] ${config.method?.toUpperCase()} ${config.url} with token: ${token.substring(0, 10)}...`);
      }
    }
    if (!config._retryCount) {
      config._retryCount = 0;
    }
    return metricsInterceptor.request(config);
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов: обработка ошибок и метрик
apiClient.interceptors.response.use(
  (response) => {
    metricsInterceptor.response(response);
    if (response.config) {
      response.config._retryCount = 0;
    }
    return response;
  },
  async (error: AxiosError) => {
    // Повторные попытки при сетевых ошибках
    if (isRetryableError(error) && error.config) {
      try {
        const retryResult = await retryInterceptor.onRejected(error);
        if (retryResult) return retryResult;
      } catch (retryError) {
        // Игнорируем ошибку ретрая и идем к основной обработке
      }
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      // Логируем ошибки
      errorLogger.logApiError(error.config?.url || '', status, error);
      
      if (status === 401) {
        console.warn('🔓 adminApi: 401 Unauthorized received for', error.config?.url);
        if (error.response?.data) {
          console.warn('🔓 adminApi: 401 details:', error.response.data);
        }
        // Убрали localStorage.removeItem('admin_token'), чтобы избежать race condition
        // Токен будет очищен в useAuth.logout() или при явном логауте
      }
    }
    
    metricsInterceptor.error(error);
    return Promise.reject(error);
  }
);

// Интерфейсы ответов
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

// Методы Admin API
const adminApi = {
  // Аутентификация
  async login(username: string, password: string) {
    console.log('📡 adminApi.login: Запрос на', `${API_PATH}/admin/auth/login`);
    const payload = {
      Username: username,
      Password: password,
    };
    console.log('📦 adminApi.login: Payload:', { Username: username, Password: '***' });
    
    try {
      const response = await apiClient.post('/admin/auth/login', payload, {
        timeout: 15000,
      });

      // Бэкенд возвращает PascalCase: AccessToken
      const token = response.data?.AccessToken || response.data?.access_token;

      if (token) {
        localStorage.setItem('admin_token', token);
        // Бэкенд может возвращать данные в PascalCase или camelCase
        const adminData = response.data.Admin || response.data.admin || response.data.User || response.data.user;
        
        return {
          access_token: token,
          admin: {
            id: (adminData?.Id || adminData?.id || response.data.user_id || '1').toString(),
            email: adminData?.Email || adminData?.email || username,
            role: (adminData?.Role || adminData?.role || 'admin').toLowerCase() as any,
          },
        };
      }
      throw new Error('Invalid response from server');
    } catch (error: any) {
      console.error('❌ adminApi.login: Error response:', error.response?.data);
      throw error;
    }
  },

  async register(data: any) {
    console.log('📡 adminApi.register: Запрос на', `${API_PATH}/admin/auth/register`);
    // Преобразуем ключи в PascalCase для бэкенда
    const payload = {
      Username: data.username,
      Email: data.email,
      Password: data.password,
      Role: data.role || 'admin'
    };
    console.log('📦 adminApi.register: Payload:', payload);
    const response = await apiClient.post('/admin/auth/register', payload, {
      timeout: 15000,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('admin_token');
  },

  async getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
    console.log('📡 adminApi.getCurrentAdmin: Запрос на /admin/me');
    const response = await apiClient.get('/admin/me');
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Дашборд
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Пользователи
  async getUsers(page = 1, page_size = 20, search?: string): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params: any = { page, page_size };
    if (search?.trim()) params.search = search.trim();
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  async updateUser(id: number, data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data;
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

  // Партнеры
  async getPartners(page = 1, page_size = 20, search?: string, status?: string): Promise<ApiResponse<PaginatedResponse<Partner>>> {
    const params: any = { page, page_size };
    if (search?.trim()) params.search = search.trim();
    if (status) params.status = status;
    const response = await apiClient.get('/admin/partners', { params });
    return response.data;
  },

  async getPartnerById(id: number): Promise<ApiResponse<Partner>> {
    const response = await apiClient.get(`/admin/partners/${id}`);
    return response.data;
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

  // Товары партнеров
  async getPartnerProducts(partnerId: number, page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await apiClient.get(`/admin/partners/${partnerId}/products`, {
      params: { page, page_size },
    });
    return response.data;
  },

  async createPartnerProduct(partnerId: number, data: any): Promise<ApiResponse<any>> {
    const response = await apiClient.post(`/admin/partners/${partnerId}/products`, data);
    return response.data;
  },

  async updatePartnerProduct(partnerId: number, productId: number, data: any): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/admin/partners/${partnerId}/products/${productId}`, data);
    return response.data;
  },

  async deletePartnerProduct(partnerId: number, productId: number): Promise<void> {
    await apiClient.delete(`/admin/partners/${partnerId}/products/${productId}`);
  },

  // Акции и баннеры
  async getPromotions(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Promotion>>> {
    const response = await apiClient.get('/admin/promotions', {
      params: { page, page_size },
    });
    return response.data;
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

  // Транзакции
  async getTransactions(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const response = await apiClient.get('/admin/transactions', {
      params: { page, page_size },
    });
    return response.data;
  },

  async getTransactionById(id: number): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data;
  },

  // Уведомления
  async getNotifications(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await apiClient.get('/admin/notifications', {
      params: { page, page_size },
    });
    return response.data;
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

  // Рефералы
  async getReferrals(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/referrals');
    return response.data;
  },

  async getReferralsStats(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/referrals/stats');
    return response.data;
  },

  // Настройки и Справочники
  async getSettings(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  async updateSettings(data: Partial<any>): Promise<ApiResponse<any>> {
    const response = await apiClient.put('/admin/settings', data);
    return response.data;
  },

  async getCategories(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/categories');
    return response.data;
  },

  async createCategory(data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/admin/categories', data);
    return response.data;
  },

  async getCities(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/cities');
    return response.data;
  },

  async createCity(data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/admin/cities', data);
    return response.data;
  },

  async deleteCity(id: number): Promise<void> {
    await apiClient.delete(`/admin/cities/${id}`);
  },

  // Загрузка файлов
  async uploadPartnerLogo(partnerId: number, file: File): Promise<ApiResponse<{ logo_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/upload/partner/logo/${partnerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadPartnerCover(partnerId: number, file: File): Promise<ApiResponse<{ cover_image_url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/upload/partner/cover/${partnerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default adminApi;
export type { ApiResponse, PaginatedResponse };
