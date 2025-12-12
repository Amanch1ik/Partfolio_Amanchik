import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import React, { Suspense, lazy } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeMonitoring } from '@shared/monitoring';
import { OfflineIndicator } from '@shared/components/OfflineIndicator';

// Lazy loading для страниц
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const LocationsPage = lazy(() => import('./pages/LocationsPage').then(module => ({ default: module.LocationsPage })));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage').then(module => ({ default: module.PromotionsPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then(module => ({ default: module.EmployeesPage })));
// Биллинг и интеграции удалены - партнеры не должны иметь к ним доступ

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
      // Отключаем автоматические интервалы обновления (используем WebSocket для real-time)
      refetchInterval: false,
      refetchIntervalInBackground: false,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #0F2A1D 0%, #375534 25%, #689071 50%, #AEC380 75%, #E3EED4 100%)',
  }}>
    <Spin size="large" />
    <div style={{ marginTop: 16, color: '#689071', fontSize: 14 }}>Загрузка...</div>
  </div>
);

function App() {
  const language = localStorage.getItem('language') || 'ru';
  const antdLocale = language === 'en' ? enUS : ruRU;
  
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
              colorText: '#1a1a1a',
            },
            components: {
              Menu: {
                itemSelectedBg: isDark ? 'rgba(174, 195, 128, 0.2)' : 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
                itemSelectedColor: isDark ? '#AEC380' : '#ffffff',
                itemHoverBg: isDark ? 'rgba(174, 195, 128, 0.1)' : '#E3EED4',
                itemActiveBg: isDark ? 'rgba(174, 195, 128, 0.2)' : 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
                itemBorderRadius: 12,
              },
              Button: {
                borderRadius: 12,
                primaryShadow: '0 4px 12px rgba(104, 144, 113, 0.3)',
                fontWeight: 500,
              },
              Card: {
                borderRadius: 16,
                boxShadow: isDark ? '0 2px 12px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(15, 42, 29, 0.08)',
                paddingLG: 24,
              },
              Input: {
                borderRadius: 12,
                activeBorderColor: isDark ? '#AEC380' : '#689071',
                hoverBorderColor: '#AEC380',
              },
              Table: {
                borderRadius: 12,
                headerBg: isDark ? '#1a2f1f' : '#F0F7EB',
                headerColor: '#1a1a1a',
              },
            },
          }}
        >
          <AntApp>
            <OfflineIndicator />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
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
                              <Route path="/profile" element={<ProfilePage />} />
                              <Route path="/locations" element={<LocationsPage />} />
                              <Route path="/promotions" element={<PromotionsPage />} />
                              <Route path="/transactions" element={<TransactionsPage />} />
                              <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
                              {/* Биллинг и интеграции удалены - партнеры не должны иметь к ним доступ */}
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          </Suspense>
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

