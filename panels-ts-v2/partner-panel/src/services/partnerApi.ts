import axios, { AxiosInstance, AxiosError } from 'axios';
import { createMetricsInterceptor, errorLogger } from '../../../shared/monitoring';
import { getUserFriendlyMessage, logError, shouldRedirectToLogin } from '../../../shared/utils/errorHandler';

// Базовый URL backend'a. Если задан VITE_API_URL (напр. https://api.yessgo.org),
// используем его, иначе работаем через относительный путь и Vite/nginx proxy.
const ENV_API_BASE = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = ENV_API_BASE
  ? ENV_API_BASE.replace(/\/$/, '')
  : '';

// Demo‑режим для партнёрской панели
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд таймаут для всех запросов (увеличено для медленных соединений)
});

// Создаем интерцептор метрик для отслеживания API запросов
const metricsInterceptor = createMetricsInterceptor();

// Интерцептор для добавления токена и метрик
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('partner_token');
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
      
      // Логируем ошибку в систему мониторинга
      errorLogger.logApiError(
        error.config?.url || '',
        status,
        error
      );
      
      switch (status) {
        case 401:
          // Токен истек или невалиден
          localStorage.removeItem('partner_token');
          localStorage.removeItem('partner_user');
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
        case 500:
          console.error('Ошибка сервера:', data?.detail || 'Internal Server Error');
          break;
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
      
      const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'relative /api/v1';
      console.error(`Нет ответа от сервера. Проверьте подключение к бэкенду: ${apiUrl}`);
      console.error('Возможные причины:');
      console.error('  1. Бэкенд не запущен');
      console.error('  2. Неправильный API URL в .env файле');
      console.error('  3. Проблемы с сетью или firewall');
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

// Partner API методы
const partnerApi = {
  // Аутентификация
  async login(username: string, password: string) {
    // В demo‑режиме не ходим на сервер: авторизуем «фиктивного» партнёра
    if (DEMO_MODE) {
      const demoToken = 'demo-partner-token';
      localStorage.setItem('partner_token', demoToken);
      const demoPartner = {
        id: 'demo-partner',
        email: username || 'partner@yessgo.org',
        username: 'Demo Partner',
        role: 'partner' as const,
      };
      localStorage.setItem('partner_user', JSON.stringify(demoPartner));
      return {
        access_token: demoToken,
        user_id: demoPartner.id,
        partner: demoPartner,
      };
    }
    try {
      // Используем партнерский endpoint
      const base = API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1';
      const response = await axios.post(`${base}/partner/auth/login`, {
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
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          throw new Error(`Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на ${API_BASE_URL}`);
        } else {
          throw new Error(`Не удалось подключиться к серверу. Проверьте, что бэкенд запущен на ${API_BASE_URL}`);
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
    if (DEMO_MODE) {
      return {
        data: {
          total_transactions: 1200,
          total_revenue: 540000,
          today_transactions: 34,
          today_revenue: 12500,
        },
      } as any;
    }
    return apiClient.get('/partner/dashboard/stats');
  },

  async getDashboardCharts(days: number = 7) {
    return apiClient.get('/partner/dashboard/charts', { params: { days } });
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
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            name: 'Demo Coffee',
            address: 'ул. Киевская 1',
            latitude: 42.8746,
            longitude: 74.5698,
          },
        ],
      };
    }
    try {
      const response = await apiClient.get('/partner/locations');
      return response;
    } catch (error: any) {
      console.error('Error fetching locations:', error.response?.data || error.message);
      // Возвращаем безопасное значение без localStorage fallback
      return { data: [] };
    }
  },

  async createLocation(data: any) {
    try {
      return await apiClient.post('/partner/locations', data);
    } catch (error: any) {
      console.error('Error creating location:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async updateLocation(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/locations/${id}`, data);
    } catch (error: any) {
      console.error('Error updating location:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async deleteLocation(id: number) {
    try {
      return await apiClient.delete(`/partner/locations/${id}`);
    } catch (error: any) {
      console.error('Error deleting location:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  // Promotions
  async getPromotions() {
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            title: '2 по цене 1',
            is_active: true,
          },
        ],
      };
    }
    try {
      const response = await apiClient.get('/promotions');
      return response;
    } catch (error: any) {
      console.error('Error fetching promotions:', error.response?.data || error.message);
      // Возвращаем безопасное значение без localStorage fallback
      return { data: [] };
    }
  },

  async createPromotion(data: any) {
    try {
      return await apiClient.post('/partner/promotions', data);
    } catch (error: any) {
      console.error('Error creating promotion:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async updatePromotion(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/promotions/${id}`, data);
    } catch (error: any) {
      console.error('Error updating promotion:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async deletePromotion(id: number) {
    try {
      return await apiClient.delete(`/partner/promotions/${id}`);
    } catch (error: any) {
      console.error('Error deleting promotion:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  // Transactions
  async getTransactions(params?: { page?: number; limit?: number; start_date?: string; end_date?: string }) {
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            amount: 250,
            created_at: new Date().toISOString(),
            status: 'completed',
          },
        ],
      };
    }
    try {
      const response = await apiClient.get('/partner/transactions', { params });
      return response;
    } catch (error: any) {
      console.error('Error fetching transactions:', error.response?.data || error.message);
      // Возвращаем безопасное значение без localStorage fallback
      return { data: [] };
    }
  },

  async getTransaction(id: number) {
    return apiClient.get(`/partner/transactions/${id}`);
  },

  // Employees
  async getEmployees() {
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            name: 'Demo Employee',
            role: 'cashier',
          },
        ],
      };
    }
    try {
      const response = await apiClient.get('/partner/employees');
      return response;
    } catch (error: any) {
      console.error('Error fetching employees:', error.response?.data || error.message);
      // Возвращаем безопасное значение без localStorage fallback
      return { data: [] };
    }
  },

  async createEmployee(data: any) {
    try {
      return await apiClient.post('/partner/employees', data);
    } catch (error: any) {
      console.error('Error creating employee:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async updateEmployee(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/employees/${id}`, data);
    } catch (error: any) {
      console.error('Error updating employee:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  async deleteEmployee(id: number) {
    try {
      return await apiClient.delete(`/partner/employees/${id}`);
    } catch (error: any) {
      console.error('Error deleting employee:', error.response?.data || error.message);
      throw error; // Пробрасываем ошибку вместо fallback
    }
  },

  // Billing
  async getBillingInfo() {
    if (DEMO_MODE) {
      return {
        data: {
          balance: 12000,
          next_invoice_date: new Date().toISOString(),
        },
      } as any;
    }
    return apiClient.get('/partner/billing');
  },

  async getBillingHistory() {
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            amount: 5000,
            created_at: new Date().toISOString(),
          },
        ],
      } as any;
    }
    return apiClient.get('/partner/billing/history');
  },

  async createInvoice(data: any) {
    return apiClient.post('/partner/billing/invoices', data);
  },

  // Tax rules (optional, may be not implemented on backend)
  async getTaxRules() {
    try {
      return await apiClient.get('/partner/tax-rules');
    } catch {
      // если endpoint отсутствует или оффлайн — возвращаем пустой список,
      // чтобы UI корректно отрисовался без падения
      return { data: [] };
    }
  },

  // Shipping methods (optional, may be not implemented on backend)
  async getShippingMethods() {
    try {
      return await apiClient.get('/partner/shipping-methods');
    } catch {
      return { data: [] };
    }
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

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number }) {
    if (DEMO_MODE) {
      return {
        data: [
          {
            id: 1,
            title: 'Новая акция',
            message: 'Запущена демо‑акция для партнёров',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    try {
      // Используем endpoint для текущего пользователя
      const response = await apiClient.get('/notifications/me', { params });
      return response;
    } catch (error: any) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
      // Возвращаем безопасное значение без fallback
      return { data: [] };
    }
  },

  async markNotificationAsRead(id: number) {
    try {
      return await apiClient.put(`/notifications/${id}/read`);
    } catch (error: any) {
      console.error('Error marking notification as read:', error.response?.data || error.message);
      throw error;
    }
  },

  async deleteNotification(id: number) {
    try {
      return await apiClient.delete(`/notifications/${id}`);
    } catch (error: any) {
      console.error('Error deleting notification:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default partnerApi;

