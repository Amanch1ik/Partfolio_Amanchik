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
import { initializeMonitoring } from '../../shared/monitoring';

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
// PartnerLocationsPage удалена - точки партнеров теперь управляются через форму добавления партнеров

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Отключаем автоматическое обновление при фокусе окна
      refetchOnWindowFocus: false,
      // Отключаем автоматическое обновление при подключении к сети
      refetchOnReconnect: false,
      // Устанавливаем разумное время жизни кэша
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут (время жизни в GC)
      // Повторяем запрос только при ошибках сети
      retry: (failureCount, error) => {
        // Не повторяем при 4xx ошибках (клиентские ошибки)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Повторяем до 3 раз при других ошибках
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Для мутаций используем оптимистичные обновления где возможно
      retry: 1,
      retryDelay: 1000,
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
    background: 'linear-gradient(135deg, #689071 0%, #AEC380 50%, #E3EED4 100%)',
  }}>
    <Spin size="large" />
    <span style={{ marginLeft: 16, color: 'var(--color-text-primary)' }}>Загрузка...</span>
  </div>
);

function App() {
  const { language } = useI18nContext();
  const antdLocale = language === 'en' ? enUS : ruRU; // Для кыргызского пока используем русский
  
  // Получаем текущую тему для динамического изменения Ant Design темы
  const [isDark, setIsDark] = React.useState(() => {
    const savedTheme = localStorage.getItem('admin_panel_theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  // Слушаем изменения темы
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    
    // Устанавливаем начальное значение
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme === 'dark');
    
    return () => observer.disconnect();
  }, []);
  
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
            algorithm: isDark ? undefined : undefined, // Можно использовать theme.darkAlgorithm для темной темы
            token: {
              colorPrimary: isDark ? '#AEC380' : '#689071',
              borderRadius: 12,
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              colorSuccess: '#52c41a',
              colorError: '#ff4d4f',
              colorWarning: '#AEC380',
              colorInfo: '#1890ff',
              colorBgBase: isDark ? '#0d1a12' : '#ffffff',
              colorText: isDark ? '#e8f0e3' : '#0F2A1D',
            },
            components: {
              Menu: {
                itemSelectedBg: 'var(--color-primary, #689071)',
                itemSelectedColor: 'var(--color-text-inverse, #ffffff)',
                itemHoverBg: 'var(--color-bg-hover)',
                itemActiveBg: 'var(--color-primary, #689071)',
                itemBorderRadius: 12,
              },
              Button: {
                borderRadius: 12,
                primaryShadow: '0 4px 12px rgba(104, 144, 113, 0.3)',
                fontWeight: 500,
              },
              Card: {
                borderRadius: 16,
                boxShadow: 'var(--shadow-md)',
                paddingLG: 24,
              },
              Input: {
                borderRadius: 12,
                activeBorderColor: 'var(--color-primary)',
                hoverBorderColor: 'var(--color-border-hover)',
              },
              Table: {
                borderRadius: 12,
                headerBg: 'var(--color-bg-tertiary)',
                headerColor: 'var(--color-text-primary)',
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
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
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
