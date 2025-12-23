import axios from 'axios';

// В development используем относительный путь через Vite proxy
const IS_DEV = import.meta.env.DEV;
const ENV_API_BASE = import.meta.env.VITE_API_URL || '';
const API_PATH = IS_DEV && ENV_API_BASE
  ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

// Создаем экземпляр axios с настройками
const apiClient = axios.create({
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

const storiesApi = {
  getAll: async (params?: {
    status?: string;
    partner_id?: number;
    city_id?: number;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const response = await apiClient.get('/admin/stories', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/admin/stories/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/admin/stories', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/admin/stories/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/admin/stories/${id}`);
    return response.data;
  },

  publish: async (id: number) => {
    const response = await apiClient.post(`/admin/stories/${id}/publish`);
    return response.data;
  },

  archive: async (id: number) => {
    const response = await apiClient.post(`/admin/stories/${id}/archive`);
    return response.data;
  },

  getStats: async (id: number) => {
    const response = await apiClient.get(`/admin/stories/${id}/stats`);
    return response.data;
  },
};

export default storiesApi;

