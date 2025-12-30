import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  DashboardStats,
  User,
  Partner,
  Promotion,
  Transaction,
  AdminUser,
} from "@/types";
import { createMetricsInterceptor, errorLogger } from "@shared/monitoring";
import {
  createRetryInterceptor,
  isRetryableError,
} from "@shared/utils/retryUtils";

// Конфигурация API
// Порядок приоритета:
// 1) Если явно включен mock (VITE_USE_MOCK === 'true') — используем локальный mock (VITE_API_PROXY_TARGET || http://localhost:4000)
// 2) Если указан VITE_API_BASE_URL — используем его (без /api суффикса, добавляем /api при необходимости)
// 3) В противном случае используем VITE_API_PROXY_TARGET в development или '/api/v1' в production
const useMock = import.meta.env.VITE_USE_MOCK === "true";
const explicitBase = import.meta.env.VITE_API_BASE_URL;
const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET;

const API_PATH = (() => {
  if (useMock) {
    const base = proxyTarget || "http://localhost:4000";
    return `${base.replace(/\/$/, "")}/api`;
  }

  // В development предпочитаем относительный путь '/api' чтобы Vite dev-server
  // мог проксировать запросы к реальному API и избежать CORS.
  if (import.meta.env.DEV) {
    return "/api";
  }

  if (explicitBase) {
    // если явно указали базовый URL (например https://api.yessgo.org), используем его
    return `${explicitBase.replace(/\/$/, "")}/api`;
  }

  // production default (relative) or proxyTarget if provided
  return proxyTarget ? `${proxyTarget.replace(/\/$/, "")}/api` : "/api/v1";
})();

// Создаем экземпляр axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_PATH,
  headers: {
    "Content-Type": "application/json",
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
    if (
      config.url?.includes("/admin/auth/login") ||
      config.url?.includes("/admin/auth/register")
    ) {
      return config;
    }

    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta.env.DEV) {
        console.log(
          `📡 [API Request] ${config.method?.toUpperCase()} ${
            config.url
          } with token: ${token.substring(0, 10)}...`
        );
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
      errorLogger.logApiError(error.config?.url || "", status, error);

      if (status === 401) {
        console.warn(
          "🔓 adminApi: 401 Unauthorized received for",
          error.config?.url
        );
        if (error.response?.data) {
          console.warn("🔓 adminApi: 401 details:", error.response.data);
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

// Вспомогательные утилиты нормализации ответа
function unwrapResponse<T>(response: any): any {
  // API может возвращать { data: { items: [...] } } или { data: [...] } или { items: [...] } или plain array
  if (!response) return null;
  const payload = response.data ?? response;
  if (payload == null) return null;
  // If payload has items, return payload
  if (payload.items !== undefined) return payload;
  // If payload itself is an array, return as items
  if (Array.isArray(payload))
    return {
      items: payload,
      total: payload.length,
      page: 1,
      page_size: payload.length,
    };
  // If payload is object with nested data
  if (payload.data !== undefined) {
    const inner = payload.data;
    if (Array.isArray(inner))
      return {
        items: inner,
        total: inner.length,
        page: 1,
        page_size: inner.length,
      };
    if (inner.items !== undefined) return inner;
  }
  // Fallback - return payload as single item list
  return { items: [payload], total: 1, page: 1, page_size: 1 };
}

// Методы Admin API
const adminApi = {
  // Аутентификация
  async login(username: string, password: string) {
    console.log("📡 adminApi.login: Attempting login for", username);
    const payload = { Username: username, Password: password };
    console.log("📦 adminApi.login: Payload:", {
      Username: username,
      Password: "***",
    });

    // Try multiple candidate paths (useful when external API path differs)
    const candidatePaths = [
      "/api/admin/auth/login",
      "/api/v1/admin/auth/login",
      "/admin/auth/login",
      "/auth/admin/login",
      "/admin/login",
    ];

    async function tryPaths(): Promise<any> {
      for (const p of candidatePaths) {
        try {
          if (import.meta.env.DEV) {
            // Use fetch in dev to go through Vite proxy reliably
            const res = await fetch(p, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              console.warn(
                `adminApi.login: attempt ${p} returned ${res.status}`
              );
              if (res.status === 404) continue;
            } else {
              const data = await res.json();
              return { data, status: res.status };
            }
          } else {
            // Production: use axios client with absolute path
            const resp = await apiClient.post(
              p.replace(/^\/api/, ""),
              payload,
              { timeout: 15000 }
            );
            return resp;
          }
        } catch (err: any) {
          console.warn(
            `adminApi.login: attempt ${p} failed`,
            err?.message || err
          );
          continue;
        }
      }
      throw new Error("All login attempts failed");
    }

    try {
      const response = await tryPaths();
      const responseData = response.data ?? response;
      const token =
        responseData?.AccessToken ||
        responseData?.access_token ||
        responseData?.accessToken;
      if (token) {
        localStorage.setItem("admin_token", token);
        const adminData =
          responseData.Admin ||
          responseData.admin ||
          responseData.User ||
          responseData.user;
        return {
          access_token: token,
          admin: {
            id: (
              adminData?.Id ||
              adminData?.id ||
              responseData.user_id ||
              "1"
            ).toString(),
            email: adminData?.Email || adminData?.email || username,
            role: (
              adminData?.Role ||
              adminData?.role ||
              "admin"
            ).toLowerCase() as any,
          },
        };
      }
      throw new Error("Invalid response from server");
    } catch (error: any) {
      console.error(
        "❌ adminApi.login: Error response:",
        error?.message || error
      );
      throw error;
    }
  },

  async register(data: any) {
    console.log(
      "📡 adminApi.register: Attempting register for",
      data?.username || data?.email
    );
    const payload = {
      Username: data.username,
      Email: data.email,
      Password: data.password,
      Role: data.role || "admin",
    };
    console.log("📦 adminApi.register: Payload:", {
      Username: payload.Username,
      Email: payload.Email,
      Password: "***",
    });

    const candidatePaths = [
      "/api/admin/auth/register",
      "/api/v1/admin/auth/register",
      "/admin/auth/register",
      "/auth/admin/register",
      "/admin/register",
    ];

    for (const p of candidatePaths) {
      try {
        if (import.meta.env.DEV) {
          const res = await fetch(p, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            console.warn(
              `adminApi.register: attempt ${p} returned ${res.status}`
            );
            if (res.status === 404) continue;
          } else {
            const d = await res.json();
            return d;
          }
        } else {
          const resp = await apiClient.post(p.replace(/^\/api/, ""), payload, {
            timeout: 15000,
          });
          return resp.data;
        }
      } catch (err: any) {
        console.warn(
          `adminApi.register: attempt ${p} failed`,
          err?.message || err
        );
        continue;
      }
    }
    throw new Error("All register attempts failed");
  },

  logout() {
    localStorage.removeItem("admin_token");
  },

  async getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
    console.log("📡 adminApi.getCurrentAdmin: Запрос на /admin/me");
    const response = await apiClient.get("/admin/me");
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  // Дашборд
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await apiClient.get("/admin/dashboard/stats");
    const data = unwrapResponse(response);
    return { data: data.items?.[0] ?? data, message: response.data?.message };
  },

  // Пользователи
  async getUsers(
    page = 1,
    page_size = 20,
    search?: string
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params: any = { page, page_size };
    if (search?.trim()) params.search = search.trim();
    const response = await apiClient.get("/admin/users", { params });
    const payload = unwrapResponse(response);
    return {
      data: {
        items: payload.items,
        total: payload.total ?? payload.items.length,
        page: payload.page ?? page,
        page_size: payload.page_size ?? page_size,
      },
      message: response.data?.message,
    };
  },

  async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  async updateUser(
    id: number,
    data: Partial<User>
  ): Promise<ApiResponse<User>> {
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
  async getPartners(
    page = 1,
    page_size = 20,
    search?: string,
    status?: string
  ): Promise<ApiResponse<PaginatedResponse<Partner>>> {
    const params: any = { page, page_size };
    if (search?.trim()) params.search = search.trim();
    if (status) params.status = status;
    const response = await apiClient.get("/admin/partners", { params });
    const payload = unwrapResponse(response);
    return {
      data: {
        items: payload.items,
        total: payload.total ?? payload.items.length,
        page: payload.page ?? page,
        page_size: payload.page_size ?? page_size,
      },
      message: response.data?.message,
    };
  },

  async getPartnerById(id: number): Promise<ApiResponse<Partner>> {
    const response = await apiClient.get(`/admin/partners/${id}`);
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async createPartner(data: Partial<Partner>): Promise<ApiResponse<Partner>> {
    const response = await apiClient.post("/admin/partners", data);
    return response.data;
  },

  async updatePartner(
    id: number,
    data: Partial<Partner>
  ): Promise<ApiResponse<Partner>> {
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
  async getPartnerProducts(
    partnerId: number,
    page = 1,
    page_size = 20
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await apiClient.get(
      `/admin/partners/${partnerId}/products`,
      {
        params: { page, page_size },
      }
    );
    const payload = unwrapResponse(response);
    return {
      data: {
        items: payload.items,
        total: payload.total ?? payload.items.length,
        page: payload.page ?? page,
        page_size: payload.page_size ?? page_size,
      },
      message: response.data?.message,
    };
  },

  async createPartnerProduct(
    partnerId: number,
    data: any
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post(
      `/admin/partners/${partnerId}/products`,
      data
    );
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async updatePartnerProduct(
    partnerId: number,
    productId: number,
    data: any
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.put(
      `/admin/partners/${partnerId}/products/${productId}`,
      data
    );
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async deletePartnerProduct(
    partnerId: number,
    productId: number
  ): Promise<void> {
    await apiClient.delete(
      `/admin/partners/${partnerId}/products/${productId}`
    );
  },

  // Акции и баннеры
  async getPromotions(
    page = 1,
    page_size = 20
  ): Promise<ApiResponse<PaginatedResponse<Promotion>>> {
    const response = await apiClient.get("/admin/promotions", {
      params: { page, page_size },
    });
    const payload = unwrapResponse(response);
    return {
      data: {
        items: payload.items,
        total: payload.total ?? payload.items.length,
        page: payload.page ?? page,
        page_size: payload.page_size ?? page_size,
      },
      message: response.data?.message,
    };
  },

  async getPromotionById(id: number): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.get(`/admin/promotions/${id}`);
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async createPromotion(
    data: Partial<Promotion>
  ): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.post("/admin/promotions", data);
    return response.data;
  },

  async updatePromotion(
    id: number,
    data: Partial<Promotion>
  ): Promise<ApiResponse<Promotion>> {
    const response = await apiClient.put(`/admin/promotions/${id}`, data);
    return response.data;
  },

  async deletePromotion(id: number): Promise<void> {
    await apiClient.delete(`/admin/promotions/${id}`);
  },

  // Транзакции
  async getTransactions(
    page = 1,
    page_size = 20
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const response = await apiClient.get("/admin/transactions", {
      params: { page, page_size },
    });
    return response.data;
  },

  async getTransactionById(id: number): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data;
  },

  // Уведомления
  async getNotifications(
    page = 1,
    page_size = 20
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await apiClient.get("/admin/notifications", {
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
    const response = await apiClient.post("/admin/notifications", data);
    return response.data;
  },

  // Рефералы
  async getReferrals(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get("/admin/referrals");
    return response.data;
  },

  async getReferralsStats(): Promise<ApiResponse<any>> {
    const response = await apiClient.get("/admin/referrals/stats");
    return response.data;
  },

  // Настройки и Справочники
  async getSettings(): Promise<ApiResponse<any>> {
    const response = await apiClient.get("/admin/settings");
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async updateSettings(data: Partial<any>): Promise<ApiResponse<any>> {
    const response = await apiClient.put("/admin/settings", data);
    return response.data;
  },

  async getCategories(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get("/admin/categories");
    return response.data;
  },

  async createCategory(data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.post("/admin/categories", data);
    return response.data;
  },

  async getCities(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get("/admin/cities");
    return response.data;
  },

  async createCity(data: { name: string }): Promise<ApiResponse<any>> {
    const response = await apiClient.post("/admin/cities", data);
    return response.data;
  },

  async deleteCity(id: number): Promise<void> {
    await apiClient.delete(`/admin/cities/${id}`);
  },

  // Загрузка файлов
  async uploadPartnerLogo(
    partnerId: number,
    file: File
  ): Promise<ApiResponse<{ logo_url: string }>> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/upload/partner/logo/${partnerId}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    const payload = unwrapResponse(response);
    return {
      data: payload.items?.[0] ?? payload,
      message: response.data?.message,
    };
  },

  async uploadPartnerCover(
    partnerId: number,
    file: File
  ): Promise<ApiResponse<{ cover_image_url: string }>> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/upload/partner/cover/${partnerId}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },
};

export default adminApi;
export type { ApiResponse, PaginatedResponse };
