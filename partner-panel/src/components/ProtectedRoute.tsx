import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  
  // Проверяем токен напрямую из localStorage СРАЗУ (синхронно)
  // Это критично, чтобы не было задержек и редиректов
  const token = localStorage.getItem('partner_token');
  
  // Логируем для отладки (можно убрать в продакшене)
  if (process.env.NODE_ENV === 'development') {
    console.log('ProtectedRoute check:', {
      hasToken: !!token,
      path: location.pathname,
      tokenLength: token?.length || 0,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });
  }
  
  // Если есть токен - сразу показываем контент
  // Это позволяет работать даже если сервер недоступен
  if (token) {
    return <>{children}</>;
  }

  // Если токена нет - редирект на логин
  if (process.env.NODE_ENV === 'development') {
    console.log('No token found, redirecting to login');
  }
  return <Navigate to="/login" replace state={{ from: location }} />;
};

