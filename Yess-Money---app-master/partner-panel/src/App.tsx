import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { Suspense } from 'react';
import { MainLayout } from './components/MainLayout';
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
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 50%, #FFC859 100%)',
  }}>
    <Spin size="large" tip="Загрузка..." />
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
            colorPrimary: '#F5A623',
            borderRadius: 12,
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            colorSuccess: '#52c41a',
            colorError: '#ff4d4f',
            colorWarning: '#faad14',
            colorInfo: '#1890ff',
          },
          components: {
            Menu: {
              itemSelectedBg: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              itemSelectedColor: '#ffffff',
              itemHoverBg: '#FFF4E6',
              itemActiveBg: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              itemBorderRadius: 12,
            },
            Button: {
              borderRadius: 12,
              primaryShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
              fontWeight: 500,
            },
            Card: {
              borderRadius: 16,
              boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
              paddingLG: 24,
            },
            Input: {
              borderRadius: 12,
              activeBorderColor: '#F5A623',
              hoverBorderColor: '#F7B731',
            },
            Table: {
              borderRadius: 12,
              headerBg: '#FFF4E6',
              headerColor: '#8B4513',
            },
          },
        }}
      >
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="locations" element={<LocationsPage />} />
                <Route path="promotions" element={<PromotionsPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;

