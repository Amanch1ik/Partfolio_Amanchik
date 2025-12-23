import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  // Проверяем токен напрямую, чтобы не зависеть от состояния загрузки
  const token = localStorage.getItem('admin_token');

  // Если загрузка длится слишком долго (больше 3 секунд), проверяем токен напрямую
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
      }, 3000); // 3 секунды таймаут

      return () => clearTimeout(timer);
    } else {
      setHasTimedOut(false);
    }
  }, [isLoading]);

  // Если нет токена, сразу редиректим на логин
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Разрешаем доступ только если есть и токен, и данные пользователя загружены
  // Если токен есть, но пользователя нет — показываем спиннер (идет проверка)
  if (token && !user && !hasTimedOut) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #03533A 0%, #07B981 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#ffffff', fontWeight: 500 }}>Авторизация...</div>
        </div>
      </div>
    );
  }

  // Если токен есть и пользователь загружен (или таймаут проверки) — разрешаем доступ
  return <>{children}</>;
};
