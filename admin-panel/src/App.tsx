import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/i18n'; // Инициализация i18n
import { MainLayout } from '@/components/MainLayout';
import { LoginPage } from '@/pages/LoginPage';
import { Suspense } from 'react';
import React from 'react';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { PartnersPage } from '@/pages/PartnersPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PromotionsPage } from '@/pages/PromotionsPage';
import { StoriesPage } from '@/pages/StoriesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ReferralsPage } from '@/pages/ReferralsPage';
import { AuditPage } from '@/pages/AuditPage';
import { PartnersMapPage } from '@/pages/PartnersMapPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
    <Spin size="large" tip="Загрузка..." />
  </div>
);

function App() {
  const language = localStorage.getItem('language') || 'ru';
  const antdLocale = language === 'en' ? enUS : ruRU; // Для кыргызского тоже используем русский пока
  
  // Простая проверка, что приложение загрузилось
  React.useEffect(() => {
    console.log('App loaded');
  }, []);
  
  return (
    <ErrorBoundary>
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
          <BrowserRouter>
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
                            <Route path="/transactions" element={<TransactionsPage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/promotions" element={<PromotionsPage />} />
                            <Route path="/stories" element={<StoriesPage />} />
                            <Route path="/referrals" element={<ReferralsPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/audit" element={<AuditPage />} />
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
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
