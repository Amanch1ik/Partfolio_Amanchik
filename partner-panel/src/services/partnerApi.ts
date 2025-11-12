import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут для всех запросов
});

// Интерцептор для добавления токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('partner_token');
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
    // Перенаправляем на логин только при 401 (Unauthorized)
    // Не перенаправляем при сетевых ошибках или других статусах
    if (error.response?.status === 401) {
      // Удаляем токен только если это действительно ошибка авторизации
      localStorage.removeItem('partner_token');
      localStorage.removeItem('partner_user');
      // Перенаправляем только если мы не на странице логина
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Для всех остальных ошибок просто пробрасываем дальше
    return Promise.reject(error);
  }
);

// Partner API методы
const partnerApi = {
  // Аутентификация
  async login(username: string, password: string) {
    try {
      // Используем партнерский endpoint
      const response = await axios.post(`${API_BASE_URL}/api/v1/partner/auth/login`, {
        username,
        password,
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000, // 10 секунд таймаут
        withCredentials: true,  // Включаем credentials для работы с токенами
      });
      
      if (response.data && response.data.access_token) {
        // Сохраняем токен в localStorage
        localStorage.setItem('partner_token', response.data.access_token);
        
        // Логируем для отладки
        console.log('Token saved in partnerApi.login:', {
          tokenLength: response.data.access_token.length,
          tokenPreview: response.data.access_token.substring(0, 20) + '...',
          saved: !!localStorage.getItem('partner_token')
        });
        
        return {
          access_token: response.data.access_token,
          user_id: response.data.user_id,
          partner: response.data.user || {
            id: response.data.user_id?.toString() || '1',
            email: username,
            username: response.data.user?.first_name || username,
            role: 'partner' as const,
          },
        };
      }
      throw new Error('Неверный формат ответа от сервера');
    } catch (error: any) {
      // Обработка различных типов ошибок
      if (error.response) {
        // Сервер ответил с кодом ошибки
        const status = error.response.status;
        const detail = error.response.data?.detail || error.response.data?.message;
        
        if (status === 503) {
          throw new Error(detail || 'Сервис временно недоступен. Проверьте подключение к базе данных.');
        } else if (status === 401) {
          throw new Error(detail || 'Неверные учетные данные');
        } else if (status === 403) {
          throw new Error(detail || 'Доступ запрещен');
        } else if (status >= 500) {
          throw new Error(detail || 'Ошибка сервера. Попробуйте позже.');
        } else {
          throw new Error(detail || 'Ошибка при входе');
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Превышено время ожидания. Проверьте подключение к интернету.');
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          throw new Error('Нет соединения с сервером. Убедитесь, что сервер запущен на http://localhost:8000');
        } else {
          throw new Error('Не удалось подключиться к серверу. Проверьте, что сервер запущен.');
        }
      } else {
        // Ошибка при настройке запроса
        throw new Error(error.message || 'Ошибка при входе. Попробуйте снова.');
      }
    }
  },

  async logout() {
    localStorage.removeItem('partner_token');
  },

  async getCurrentPartner() {
    return apiClient.get('/partner/me');
  },

  // Dashboard
  async getDashboardStats() {
    return apiClient.get('/partner/dashboard/stats');
  },

  // Search users
  async searchUsers(search: string | undefined, limit: number = 20) {
    const params: any = { limit };
    // Добавляем search только если он указан и не пустой
    if (search && typeof search === 'string' && search.trim() && search.trim() !== 'all') {
      params.search = search.trim();
    }
    return apiClient.get('/partner/users/search', { params });
  },

  // Locations
  async getLocations() {
    return apiClient.get('/partner/locations');
  },

  async createLocation(data: any) {
    return apiClient.post('/partner/locations', data);
  },

  async updateLocation(id: number, data: any) {
    return apiClient.put(`/partner/locations/${id}`, data);
  },

  async deleteLocation(id: number) {
    return apiClient.delete(`/partner/locations/${id}`);
  },

  // Promotions
  async getPromotions() {
    return apiClient.get('/partner/promotions');
  },

  async createPromotion(data: any) {
    return apiClient.post('/partner/promotions', data);
  },

  async updatePromotion(id: number, data: any) {
    return apiClient.put(`/partner/promotions/${id}`, data);
  },

  async deletePromotion(id: number) {
    return apiClient.delete(`/partner/promotions/${id}`);
  },

  // Transactions
  async getTransactions(params?: { page?: number; limit?: number; start_date?: string; end_date?: string }) {
    return apiClient.get('/partner/transactions', { params });
  },

  async getTransaction(id: number) {
    return apiClient.get(`/partner/transactions/${id}`);
  },

  // Employees
  async getEmployees() {
    return apiClient.get('/partner/employees');
  },

  async createEmployee(data: any) {
    return apiClient.post('/partner/employees', data);
  },

  async updateEmployee(id: number, data: any) {
    return apiClient.put(`/partner/employees/${id}`, data);
  },

  async deleteEmployee(id: number) {
    return apiClient.delete(`/partner/employees/${id}`);
  },

  // Billing
  async getBillingInfo() {
    return apiClient.get('/partner/billing');
  },

  async getBillingHistory() {
    return apiClient.get('/partner/billing/history');
  },

  async createInvoice(data: any) {
    return apiClient.post('/partner/billing/invoices', data);
  },

  // Integrations
  async getApiKeys() {
    return apiClient.get('/partner/integrations/keys');
  },

  async createApiKey(data: any) {
    return apiClient.post('/partner/integrations/keys', data);
  },

  async deleteApiKey(id: number) {
    return apiClient.delete(`/partner/integrations/keys/${id}`);
  },

  async getIntegrationSettings() {
    return apiClient.get('/partner/integrations/settings');
  },

  async updateIntegrationSettings(data: any) {
    return apiClient.put('/partner/integrations/settings', data);
  },

  // Profile
  async updateProfile(data: any) {
    return apiClient.put('/partner/profile', data);
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/partner/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default partnerApi;

