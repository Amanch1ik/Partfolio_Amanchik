import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
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
    if (error.response?.status === 401) {
      // Токен истек или невалиден
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
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
      // Пробуем использовать JSON endpoint аутентификации
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login/json`, {
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
      // Если стандартный endpoint не работает, пробуем admin endpoint
      try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/admin/auth/login`, {
          username,
          password,
        });
        
        if (response.data.access_token) {
          localStorage.setItem('admin_token', response.data.access_token);
          return {
            access_token: response.data.access_token,
            admin: response.data.admin || {
              id: response.data.admin?.id?.toString() || '1',
              email: username,
              role: 'admin' as const,
            },
          };
        }
      } catch (adminError) {
        throw error; // Возвращаем оригинальную ошибку
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

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await apiClient.get('/admin/dashboard/stats');
      return response.data;
    } catch (error) {
      // Fallback на моковые данные если endpoint не работает
      return {
        data: {
          total_users: 0,
          active_partners: 0,
          total_transactions: 0,
          total_revenue: 0,
          users_growth: 0,
          revenue_growth: 0,
        },
      };
    }
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
  async getPartners(page = 1, page_size = 20): Promise<ApiResponse<PaginatedResponse<Partner>>> {
    const response = await apiClient.get('/admin/partners', {
      params: { page, page_size },
    });
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
    const response = await apiClient.get('/admin/transactions', {
      params: { page, page_size },
    });
    return response.data;
  },

  async getTransactionById(id: number): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data;
  },

  // Notifications
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
};

export default adminApi;
export type { ApiResponse, PaginatedResponse };

