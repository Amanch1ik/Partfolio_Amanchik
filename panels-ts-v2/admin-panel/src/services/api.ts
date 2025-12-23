/**
 * API Services - Главный экспортный файл для всех API сервисов
 */

import adminApi from './adminApi';
import axios from 'axios';
import type { DashboardStats, User, Partner, Promotion, Transaction } from '@/types';

/**
 * Auth API
 */
export const authApi = {
  login: (username: string, password: string) => adminApi.login(username, password),
  logout: () => adminApi.logout(),
  getCurrentAdmin: () => adminApi.getCurrentAdmin(),
  getCurrentUser: () => adminApi.getCurrentUser(),
};

/**
 * Dashboard API
 */
export const dashboardApi = {
  getStats: () => adminApi.getDashboardStats(),
};

/**
 * Analytics API (старый формат для совместимости)
 */
export const analyticsApi = {
  getDashboardStats: () => adminApi.getDashboardStats(),
};

/**
 * Users API
 */
export const usersApi = {
  getAll: (page?: number, page_size?: number, search?: string) => adminApi.getUsers(page, page_size, search),
  getById: (id: number) => adminApi.getUserById(id),
  update: (id: number, data: Partial<User>) => adminApi.updateUser(id, data),
  delete: (id: number) => adminApi.deleteUser(id),
  activate: (id: number) => adminApi.activateUser(id),
  deactivate: (id: number) => adminApi.deactivateUser(id),
};

/**
 * Partners API
 */
export const partnersApi = {
  getAll: (page?: number, page_size?: number, search?: string, status?: string) => 
    adminApi.getPartners(page, page_size, search, status),
  getById: (id: number) => adminApi.getPartnerById(id),
  create: (data: Partial<Partner>) => adminApi.createPartner(data),
  update: (id: number, data: Partial<Partner>) => adminApi.updatePartner(id, data),
  delete: (id: number) => adminApi.deletePartner(id),
  approve: (id: number) => adminApi.approvePartner(id),
  reject: (id: number, reason?: string) => adminApi.rejectPartner(id, reason),
};

/**
 * Promotions API
 */
export const promotionsApi = {
  getAll: (page?: number, page_size?: number) => adminApi.getPromotions(page, page_size),
  getById: (id: number) => adminApi.getPromotionById(id),
  create: (data: Partial<Promotion>) => adminApi.createPromotion(data),
  update: (id: number, data: Partial<Promotion>) => adminApi.updatePromotion(id, data),
  delete: (id: number) => adminApi.deletePromotion(id),
};

/**
 * Transactions API
 */
export const transactionsApi = {
  getAll: (page?: number, page_size?: number) => adminApi.getTransactions(page, page_size),
  getById: (id: number) => adminApi.getTransactionById(id),
};

/**
 * Referrals API
 */
export const referralsApi = {
  getAll: () => adminApi.getReferrals(),
  getStats: () => adminApi.getReferralsStats(),
};

/**
 * Notifications API
 */
export const notificationsApi = {
  getAll: (page?: number, page_size?: number) => adminApi.getNotifications(page, page_size),
  send: (data: { title: string; message: string; segment: string; scheduled_for?: string }) =>
    adminApi.sendNotification(data),
  update: (id: number, data: Partial<any>) => adminApi.updateNotification(id, data),
  delete: (id: number) => adminApi.deleteNotification(id),
};

/**
 * Audit API
 */
export const auditApi = {
  getLogs: (page?: number, page_size?: number) => adminApi.getAuditLogs(page, page_size),
  getSessions: () => adminApi.getAuditSessions(),
};

/**
 * Settings API
 */
export const settingsApi = {
  getAll: () => adminApi.getSettings(),
  update: (data: Partial<any>) => adminApi.updateSettings(data),
  categories: {
    getAll: () => adminApi.getCategories(),
    create: (data: { name: string }) => adminApi.createCategory(data),
    update: (id: number, data: { name: string }) => adminApi.updateCategory(id, data),
    delete: (id: number) => adminApi.deleteCategory(id),
  },
  cities: {
    getAll: () => adminApi.getCities(),
    create: (data: { name: string; country?: string }) => adminApi.createCity(data),
    update: (id: number, data: { name: string }) => adminApi.updateCity(id, data),
    delete: (id: number) => adminApi.deleteCity(id),
  },
  limits: {
    getAll: () => adminApi.getLimits(),
    update: (data: Record<string, any>) => adminApi.updateLimits(data),
  },
  apiKeys: {
    getAll: () => adminApi.getApiKeys(),
    create: (data: { name: string }) => adminApi.createApiKey(data),
    revoke: (id: number) => adminApi.revokeApiKey(id),
  },
};

// Экспорт типов для использования в компонентах (пробрасываем реальные типы из '@/types')
export type { DashboardStats, User, Partner, Promotion, Transaction } from '@/types';

// Экспорт основного adminApi для прямого использования если нужно
export { adminApi };

// Default export для совместимости
const api = {
  authApi,
  dashboardApi,
  analyticsApi,
  usersApi,
  partnersApi,
  promotionsApi,
  transactionsApi,
  referralsApi,
  notificationsApi,
  auditApi,
  settingsApi,
  // Прямой доступ к adminApi при необходимости
  adminApi,
  // Прямой доступ к axios для кастомных запросов
  post: (url: string, data?: any, config?: any) => {
    const IS_DEV = import.meta.env.DEV;
    const ENV_API_BASE = import.meta.env.VITE_API_URL || '';
    const API_PATH = IS_DEV && ENV_API_BASE
      ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`
      : '/api/v1';
    const token = localStorage.getItem('admin_token');
    return axios.post(`${API_PATH}${url}`, data, {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
        ...config?.headers,
      },
    });
  },
  put: (url: string, data?: any, config?: any) => {
    const IS_DEV = import.meta.env.DEV;
    const ENV_API_BASE = import.meta.env.VITE_API_URL || '';
    const API_PATH = IS_DEV && ENV_API_BASE
      ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`
      : '/api/v1';
    const token = localStorage.getItem('admin_token');
    return axios.put(`${API_PATH}${url}`, data, {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
        ...config?.headers,
      },
    });
  },
};

export { api };
export default api;
