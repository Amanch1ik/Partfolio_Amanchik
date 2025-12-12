/**
 * API Services - Главный экспортный файл для всех API сервисов партнеров
 */

import partnerApi from './partnerApi';

/**
 * Auth API
 */
export const authApi = {
  login: (username: string, password: string) => partnerApi.login(username, password),
  logout: () => partnerApi.logout(),
  getCurrentPartner: () => partnerApi.getCurrentPartner(),
};

/**
 * Dashboard API
 */
export const dashboardApi = {
  getStats: () => partnerApi.getDashboardStats(),
};

/**
 * Locations API
 */
export const locationsApi = {
  getLocations: () => partnerApi.getLocations(),
  createLocation: (data: any) => partnerApi.createLocation(data),
  updateLocation: (id: number, data: any) => partnerApi.updateLocation(id, data),
  deleteLocation: (id: number) => partnerApi.deleteLocation(id),
};

/**
 * Promotions API
 */
export const promotionsApi = {
  getPromotions: () => partnerApi.getPromotions(),
  createPromotion: (data: any) => partnerApi.createPromotion(data),
  updatePromotion: (id: number, data: any) => partnerApi.updatePromotion(id, data),
  deletePromotion: (id: number) => partnerApi.deletePromotion(id),
};

/**
 * Transactions API
 */
export const transactionsApi = {
  getTransactions: (params?: any) => partnerApi.getTransactions(params),
  getTransaction: (id: number) => partnerApi.getTransaction(id),
};

/**
 * Employees API
 */
export const employeesApi = {
  getEmployees: () => partnerApi.getEmployees(),
  createEmployee: (data: any) => partnerApi.createEmployee(data),
  updateEmployee: (id: number, data: any) => partnerApi.updateEmployee(id, data),
  deleteEmployee: (id: number) => partnerApi.deleteEmployee(id),
};

/**
 * Billing API
 */
export const billingApi = {
  getBillingInfo: () => partnerApi.getBillingInfo(),
  getBillingHistory: () => partnerApi.getBillingHistory(),
  createInvoice: (data: any) => partnerApi.createInvoice(data),
};

/**
 * Integrations API
 */
export const integrationsApi = {
  getApiKeys: () => partnerApi.getApiKeys(),
  createApiKey: (data: any) => partnerApi.createApiKey(data),
  deleteApiKey: (id: number) => partnerApi.deleteApiKey(id),
  getIntegrationSettings: () => partnerApi.getIntegrationSettings(),
  updateIntegrationSettings: (data: any) => partnerApi.updateIntegrationSettings(data),
};

/**
 * Tax rules API (optional, provided by backend)
 */
export const taxRulesApi = {
  getAll: () => partnerApi.getTaxRules?.(),
};

/**
 * Shipping methods API (optional, provided by backend)
 */
export const shippingMethodsApi = {
  getAll: () => partnerApi.getShippingMethods?.(),
};

/**
 * Profile API
 */
export const profileApi = {
  updateProfile: (data: any) => partnerApi.updateProfile(data),
  uploadAvatar: (file: File) => partnerApi.uploadAvatar(file),
};

/**
 * Notifications API
 */
export const notificationsApi = {
  getNotifications: (params?: { page?: number; limit?: number }) => partnerApi.getNotifications(params),
  markNotificationAsRead: (id: number) => partnerApi.markNotificationAsRead(id),
  deleteNotification: (id: number) => partnerApi.deleteNotification(id),
};

/**
 * Главный экспорт
 */
export const api = {
  authApi,
  dashboardApi,
  locationsApi,
  promotionsApi,
  transactionsApi,
  employeesApi,
  billingApi,
  integrationsApi,
  taxRulesApi,
  shippingMethodsApi,
  profileApi,
  partnerApi,
};

export default api;

