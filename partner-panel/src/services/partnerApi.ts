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
    // Расширенная обработка ошибок
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
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
      // Запрос отправлен, но ответа нет
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.error(`Нет ответа от сервера. Проверьте подключение к бэкенду: ${apiUrl}`);
      console.error('Возможные причины:');
      console.error('  1. Бэкенд не запущен');
      console.error('  2. Неправильный API URL в .env файле');
      console.error('  3. Проблемы с сетью или firewall');
    } else {
      // Ошибка при настройке запроса
      console.error('Ошибка запроса:', error.message);
    }
    
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
    try {
      // Партнёрские локации по /partner/locations
      return await apiClient.get('/partner/locations');
    } catch {
      try {
        const raw = localStorage.getItem('partner_locations');
        const items = raw ? JSON.parse(raw) : [];
        return { data: items };
      } catch {
        return { data: [] };
      }
    }
  },

  async createLocation(data: any) {
    try {
      return await apiClient.post('/partner/locations', data);
    } catch {
      const raw = localStorage.getItem('partner_locations');
      const items = raw ? JSON.parse(raw) : [];
      const id = items.length ? Math.max(...items.map((e: any) => Number(e.id) || 0)) + 1 : 1;
      const item = {
        id,
        key: String(id),
        name: data.name || 'Новая локация',
        address: data.address || '',
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: new Date().toISOString(),
      };
      const next = [item, ...items];
      localStorage.setItem('partner_locations', JSON.stringify(next));
      return { data: item };
    }
  },

  async updateLocation(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/locations/${id}`, data);
    } catch {
      const raw = localStorage.getItem('partner_locations');
      const items = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((e: any) => Number(e.id) === Number(id));
      if (idx === -1) {
        const item = { id, key: String(id), ...data };
        const next = [item, ...items];
        localStorage.setItem('partner_locations', JSON.stringify(next));
        return { data: item };
      }
      const nextItem = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
      const next = [...items];
      next[idx] = nextItem;
      localStorage.setItem('partner_locations', JSON.stringify(next));
      return { data: nextItem };
    }
  },

  async deleteLocation(id: number) {
    try {
      return await apiClient.delete(`/partner/locations/${id}`);
    } catch {
      const raw = localStorage.getItem('partner_locations');
      const items = raw ? JSON.parse(raw) : [];
      const next = items.filter((e: any) => Number(e.id) !== Number(id));
      localStorage.setItem('partner_locations', JSON.stringify(next));
      return { data: { success: true } as any };
    }
  },

  // Promotions (offline-friendly fallback via localStorage)
  async getPromotions() {
    try {
      // публичный список акций доступен по /promotions
      return await apiClient.get('/promotions');
    } catch (error) {
      try {
        const raw = localStorage.getItem('partner_promotions');
        const items = raw ? JSON.parse(raw) : [];
        return { data: items };
      } catch {
        return { data: [] };
      }
    }
  },

  async createPromotion(data: any) {
    try {
      return await apiClient.post('/partner/promotions', data);
    } catch {
      const raw = localStorage.getItem('partner_promotions');
      const items = raw ? JSON.parse(raw) : [];
      const id = items.length ? Math.max(...items.map((p: any) => Number(p.id) || 0)) + 1 : 1;
      const now = new Date();
      // Normalize payload for UI
      const period = Array.isArray(data.period) && data.period.length === 2
        ? `${data.period[0]?.format?.('DD.MM.YYYY') || ''} - ${data.period[1]?.format?.('DD.MM.YYYY') || ''}`
        : (data.period || '');
      const item = {
        id,
        key: String(id),
        title: data.title,
        discount: Number(data.discount) || 0,
        period,
        partner: data.partner || '—',
        priority: Number(data.priority) || 0,
        ctr: Number(data.ctr) || 0,
        stats: Number(data.stats) || 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      const next = [item, ...items];
      localStorage.setItem('partner_promotions', JSON.stringify(next));
      return { data: item };
    }
  },

  async updatePromotion(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/promotions/${id}`, data);
    } catch {
      const raw = localStorage.getItem('partner_promotions');
      const items = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((p: any) => Number(p.id) === Number(id));
      if (idx === -1) {
        const item = { id, ...data, key: String(id) };
        const next = [item, ...items];
        localStorage.setItem('partner_promotions', JSON.stringify(next));
        return { data: item };
      }
      const period = Array.isArray(data.period) && data.period.length === 2
        ? `${data.period[0]?.format?.('DD.MM.YYYY') || ''} - ${data.period[1]?.format?.('DD.MM.YYYY') || ''}`
        : (data.period || items[idx].period);
      const nextItem = {
        ...items[idx],
        ...data,
        period,
        updatedAt: new Date().toISOString(),
      };
      const next = [...items];
      next[idx] = nextItem;
      localStorage.setItem('partner_promotions', JSON.stringify(next));
      return { data: nextItem };
    }
  },

  async deletePromotion(id: number) {
    try {
      return await apiClient.delete(`/partner/promotions/${id}`);
    } catch {
      const raw = localStorage.getItem('partner_promotions');
      const items = raw ? JSON.parse(raw) : [];
      const next = items.filter((p: any) => Number(p.id) !== Number(id));
      localStorage.setItem('partner_promotions', JSON.stringify(next));
      return { data: { success: true } as any };
    }
  },

  // Transactions
  async getTransactions(params?: { page?: number; limit?: number; start_date?: string; end_date?: string }) {
    try {
      console.log('🔍 partnerApi.getTransactions: Отправка запроса к /partner/transactions с параметрами:', params);
      const response = await apiClient.get('/partner/transactions', { params });
      console.log('✅ partnerApi.getTransactions: Успешно получены транзакции:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ partnerApi.getTransactions: Ошибка API:', error.response?.data || error.message);

      // Fallback to mock data
      console.log('🔄 partnerApi.getTransactions: Использование мок данных');
      try {
        const raw = localStorage.getItem('partner_transactions');
        const items = raw ? JSON.parse(raw) : [];
        return { data: items };
      } catch {
        return { data: [] };
      }
    }
  },

  async getTransaction(id: number) {
    return apiClient.get(`/partner/transactions/${id}`);
  },

  // Employees (offline-friendly fallback via localStorage)
  async getEmployees() {
    try {
      return await apiClient.get('/partner/employees');
    } catch {
      try {
        const raw = localStorage.getItem('partner_employees');
        const items = raw ? JSON.parse(raw) : [];
        return { data: items };
      } catch {
        return { data: [] };
      }
    }
  },

  async createEmployee(data: any) {
    try {
      return await apiClient.post('/partner/employees', data);
    } catch {
      const raw = localStorage.getItem('partner_employees');
      const items = raw ? JSON.parse(raw) : [];
      const id = items.length ? Math.max(...items.map((e: any) => Number(e.id) || 0)) + 1 : 1;
      const item = {
        id,
        key: String(id),
        name: data.name,
        role: data.role,
        location: data.location,
        action: data.action || 'reset',
        createdAt: new Date().toISOString(),
      };
      const next = [item, ...items];
      localStorage.setItem('partner_employees', JSON.stringify(next));
      return { data: item };
    }
  },

  async updateEmployee(id: number, data: any) {
    try {
      return await apiClient.put(`/partner/employees/${id}`, data);
    } catch {
      const raw = localStorage.getItem('partner_employees');
      const items = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((e: any) => Number(e.id) === Number(id));
      if (idx === -1) {
        const item = { id, key: String(id), ...data };
        const next = [item, ...items];
        localStorage.setItem('partner_employees', JSON.stringify(next));
        return { data: item };
      }
      const nextItem = {
        ...items[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      const next = [...items];
      next[idx] = nextItem;
      localStorage.setItem('partner_employees', JSON.stringify(next));
      return { data: nextItem };
    }
  },

  async deleteEmployee(id: number) {
    try {
      return await apiClient.delete(`/partner/employees/${id}`);
    } catch {
      const raw = localStorage.getItem('partner_employees');
      const items = raw ? JSON.parse(raw) : [];
      const next = items.filter((e: any) => Number(e.id) !== Number(id));
      localStorage.setItem('partner_employees', JSON.stringify(next));
      return { data: { success: true } as any };
    }
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

