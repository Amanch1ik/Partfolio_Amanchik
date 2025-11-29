import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from '@/types';

// В development используем относительный путь через Vite proxy
// В production используем полный URL из переменной окружения
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:8000');
const API_PATH = import.meta.env.DEV ? '/api/v1' : `${API_BASE_URL}/api/v1`;

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_PATH,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Расширенная обработка ошибок
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
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
        case 500:
          const errorMsg = data?.detail || data?.message || 'Internal Server Error';
          console.error('Ошибка сервера:', errorMsg);
          // Показываем пользователю понятное сообщение
          if (errorMsg.includes('DateTime') || errorMsg.includes('timestamp')) {
            console.error('⚠️ Проблема с форматом даты. Убедитесь, что бэкенд обновлен с исправлениями DateTime.');
          }
          break;
        case 503:
          console.error('Сервис недоступен:', data?.detail || 'Service Unavailable');
          break;
        default:
          console.error('Ошибка API:', data?.detail || error.message);
      }
    } else if (error.request) {
      // Запрос отправлен, но ответа нет
      console.error('Нет ответа от сервера. Проверьте подключение к бэкенду.');
    } else {
      // Ошибка при настройке запроса
      console.error('Ошибка запроса:', error.message);
    }
    
    return Promise.reject(error);
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
}

// Admin API методы
const adminApi = {
  // Аутентификация
  async login(username: string, password: string) {
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
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Users
  async getUsers(page = 1, page_size = 20, search?: string): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params: any = { page, page_size };
    if (search && search.trim()) {
      params.search = search.trim();
    }
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
    const response = await apiClient.get('/partners/locations');
    // Normalize to ApiResponse shape
    return { data: response.data as any[] };
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

  // Transactions
  async getTransactions(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    try {
      const response = await apiClient.get('/admin/transactions', {
        params: { page, page_size },
      });
      return response.data;
    } catch {
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

  // Audit
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
    const response = await apiClient.post('/admin/settings/categories', data);
    return response.data;
  },

  async updateCategory(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/admin/settings/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/admin/settings/categories/${id}`);
  },

  async getCities(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/admin/settings/cities');
    return response.data;
  },

  async createCity(data: { name: string; country?: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/admin/settings/cities', data);
    return response.data;
  },

  async updateCity(id: number, data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/admin/settings/cities/${id}`, data);
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
    const response = await apiClient.post('/admin/settings/api-keys', data);
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

