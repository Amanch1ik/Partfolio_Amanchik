import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { Suspense } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LocationsPage } from './pages/LocationsPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { BillingPage } from './pages/BillingPage';

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
                            <Route path="/integrations" element={<IntegrationsPage />} />
                            <Route path="/billing" element={<BillingPage />} />
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

