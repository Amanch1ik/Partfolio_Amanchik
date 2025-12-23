import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/i18n'; // Инициализация i18n
import { MainLayout } from '@/components/MainLayout';
import { LoginPage } from '@/pages/LoginPage';
import { Suspense, lazy } from 'react';
import React from 'react';
import { useI18nContext } from '@/i18nGatewayContext';
import { initializeMonitoring } from '@shared/monitoring';
import { OfflineIndicator } from '@shared/components/OfflineIndicator';

// Lazy loading для страниц
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(module => ({ default: module.UsersPage })));
const PartnersPage = lazy(() => import('@/pages/PartnersPage').then(module => ({ default: module.PartnersPage })));
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const PromotionsPage = lazy(() => import('@/pages/PromotionsPage').then(module => ({ default: module.PromotionsPage })));
const StoriesPage = lazy(() => import('@/pages/StoriesPage').then(module => ({ default: module.StoriesPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ReferralsPage = lazy(() => import('@/pages/ReferralsPage').then(module => ({ default: module.ReferralsPage })));
const AuditPage = lazy(() => import('@/pages/AuditPage').then(module => ({ default: module.AuditPage })));
const PartnersMapPage = lazy(() => import('@/pages/PartnersMapPage').then(module => ({ default: module.PartnersMapPage })));
const MonitoringPage = lazy(() => import('@/pages/MonitoringPage').then(module => ({ default: module.MonitoringPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(module => ({ default: module.ProductsPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
// PartnerLocationsPage удалена - точки партнеров теперь управляются через форму добавления партнеров

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Включаем автоматическое обновление при подключении к сети (для офлайн режима)
      refetchOnReconnect: true,
      // Отключаем автоматическое обновление при фокусе окна (чтобы не было лишних запросов)
      refetchOnWindowFocus: false,
      // Включаем обновление при монтировании только если данные устарели
      refetchOnMount: true,
      // Устанавливаем разумное время жизни кэша
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут (время жизни в GC)
      // Повторяем запрос при ошибках сети и временных ошибках сервера
      retry: (failureCount, error: any) => {
        // Не повторяем при 4xx ошибках (клиентские ошибки), кроме 408 и 429
        if (error?.response?.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
          // Не повторяем при 500 ошибке (Internal Server Error) - обычно постоянная ошибка
          if (status === 500) {
            return false;
          }
          // Повторяем только временные ошибки сервера (502, 503, 504)
          if (status >= 500 && status < 600 && status !== 502 && status !== 503 && status !== 504) {
            return false;
          }
        }
        // Не повторяем при отмененных запросах
        if (error?.name === 'CanceledError' || error?.message?.includes('canceled')) {
          return false;
        }
        // Повторяем до 2 раз при сетевых ошибках и временных 5xx
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Включаем структурное сравнение для лучшей дедупликации
      structuralSharing: true,
      // Настройки для офлайн режима
      networkMode: 'online',
    },
    mutations: {
      // Для мутаций используем оптимистичные обновления где возможно
      retry: (failureCount, error: any) => {
        // Повторяем только при сетевых ошибках и 5xx
        if (error?.response?.status) {
          const status = error.response.status;
          if (status >= 500 || status === 408 || status === 429) {
            return failureCount < 2;
          }
        }
        // Повторяем при сетевых ошибках
        if (error?.code === 'ERR_NETWORK' || error?.request) {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'online',
    },
  },
});

// Fallback компонент для Suspense
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #03533A 0%, #07B981 50%, #E8F8F3 100%)',
  }}>
    <Spin size="large" />
    <span style={{ marginLeft: 16, color: '#ffffff', fontWeight: 500 }}>Загрузка...</span>
  </div>
);

function App() {
  const { language } = useI18nContext();
  const antdLocale = language === 'en' ? enUS : ruRU; // Для кыргызского пока используем русский
  
  // Всегда используем светлую тему
  const [isDark] = React.useState(false);
  
  // Инициализация системы мониторинга при загрузке приложения
  React.useEffect(() => {
    initializeMonitoring();
  }, []);
  
  // Глобальная обработка ошибок
  React.useEffect(() => {
    // Игнорируем ошибки Shadow DOM (обычно из внешних библиотек/расширений)
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      // Игнорируем ошибки Shadow DOM
      if (message && typeof message === 'string' && message.includes('attachShadow')) {
        return true; // Предотвращаем вывод ошибки в консоль
      }
      // Игнорируем ошибки WebSocket после отключения
      if (message && typeof message === 'string' && message.includes('WebSocket connection')) {
        // Проверяем, не был ли WebSocket отключен
        const wsDisabled = localStorage.getItem('ws_disabled') === 'true';
        if (wsDisabled) {
          return true; // Предотвращаем вывод ошибки в консоль
        }
      }
      // Для остальных ошибок используем стандартную обработку
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Обработка необработанных промисов
    const unhandledRejection = (event: PromiseRejectionEvent) => {
      // Игнорируем ошибки WebSocket
      if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
        const message = String(event.reason.message || '');
        if (message.includes('WebSocket') || message.includes('attachShadow')) {
          event.preventDefault();
          return;
        }
      }
    };
    window.addEventListener('unhandledrejection', unhandledRejection);

    return () => {
      window.onerror = originalError;
      window.removeEventListener('unhandledrejection', unhandledRejection);
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={antdLocale}
          theme={{
            algorithm: isDark ? undefined : undefined,
            token: {
              colorPrimary: '#07B981',
              borderRadius: 12,
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              colorSuccess: '#10B981',
              colorError: '#EF4444',
              colorWarning: '#F59E0B',
              colorInfo: '#3B82F6',
              colorBgBase: '#ffffff',
              colorText: '#03533A',
            },
            components: {
              Menu: {
                itemSelectedBg: 'linear-gradient(135deg, #03533A 0%, #07B981 100%)',
                itemSelectedColor: '#ffffff',
                itemHoverBg: '#E8F8F3',
                itemActiveBg: '#07B981',
                itemBorderRadius: 12,
              },
              Button: {
                borderRadius: 12,
                primaryShadow: '0 4px 12px rgba(3, 83, 58, 0.3)',
                fontWeight: 500,
              },
              Card: {
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(3, 83, 58, 0.08)',
                paddingLG: 24,
              },
              Input: {
                borderRadius: 12,
                activeBorderColor: '#07B981',
                hoverBorderColor: '#07B981',
              },
              Table: {
                borderRadius: 12,
                headerBg: '#F0FDF9',
                headerColor: '#03533A',
              },
            },
          }}
        >
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AntApp>
              <OfflineIndicator />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                              <Route path="/" element={<DashboardPage />} />
                              <Route path="/users" element={<UsersPage />} />
                              <Route path="/partners" element={<PartnersPage />} />
                              <Route path="/partners/map" element={<PartnersMapPage />} />
                              <Route path="/partners/:partnerId/products" element={<ProductsPage />} />
                              {/* PartnerLocationsPage удалена - точки партнеров управляются через форму добавления партнеров */}
                              <Route path="/transactions" element={<TransactionsPage />} />
                              <Route path="/notifications" element={<NotificationsPage />} />
                              <Route path="/promotions" element={<PromotionsPage />} />
                              <Route path="/stories" element={<StoriesPage />} />
                              <Route path="/referrals" element={<ReferralsPage />} />
                              <Route path="/settings" element={<SettingsPage />} />
                              <Route path="/audit" element={<AuditPage />} />
                              <Route path="/monitoring" element={<MonitoringPage />} />
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          </Suspense>
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </AntApp>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
