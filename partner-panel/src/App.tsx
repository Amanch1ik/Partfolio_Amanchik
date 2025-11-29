import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import React, { Suspense, lazy } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';

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
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={antdLocale}
        theme={{
          token: {
            colorPrimary: '#689071',
            borderRadius: 12,
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            colorSuccess: '#52c41a',
            colorError: '#ff4d4f',
            colorWarning: '#AEC380',
            colorInfo: '#1890ff',
          },
          components: {
            Menu: {
              itemSelectedBg: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
              itemSelectedColor: '#ffffff',
              itemHoverBg: '#E3EED4',
              itemActiveBg: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
              itemBorderRadius: 12,
            },
            Button: {
              borderRadius: 12,
              primaryShadow: '0 4px 12px rgba(104, 144, 113, 0.3)',
              fontWeight: 500,
            },
            Card: {
              borderRadius: 16,
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
              paddingLG: 24,
            },
            Input: {
              borderRadius: 12,
              activeBorderColor: '#689071',
              hoverBorderColor: '#AEC380',
            },
            Table: {
              borderRadius: 12,
              headerBg: '#F0F7EB',
              headerColor: '#0F2A1D',
            },
          },
        }}
      >
        <AntApp>
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
  );
}

export default App;

