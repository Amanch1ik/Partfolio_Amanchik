import { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();
  const devModeEnabled = useMemo(() => import.meta.env.VITE_DEV_MODE === 'true', []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');

      if (devModeEnabled) {
        // В dev-режиме не ходим в API: сразу ставим dev пользователя и токен
        const devUser = {
          id: 'dev',
          email: 'dev@yessgo.org',
          role: 'admin' as const,
        };
        localStorage.setItem('admin_token', 'dev-token');
        localStorage.setItem('admin_user', JSON.stringify(devUser));
        setUser(devUser);
        setLoading(false);
        return;
      }

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Если токен есть, сначала ставим базового пользователя, затем пытаемся подтянуть реальные данные
      setUser({
        id: '1',
        email: 'admin@yess.kg',
        role: 'admin',
      });
      setLoading(false);

      authApi
        .getCurrentAdmin()
        .then((response: any) => {
          if (response?.data) {
            setUser({
              id: response.data.id?.toString() || '1',
              email: response.data.email || response.data.username || 'admin@yess.kg',
              role: response.data.role || 'admin',
            });
          }
        })
        .catch((error) => {
          console.warn('Failed to get current admin:', error);
        });
    };

    // Проверяем только один раз при монтировании
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполняется только один раз

  const tokenExists = !!localStorage.getItem('admin_token');
  
  return {
    user,
    isAuthenticated: tokenExists && (isAuthenticated || !!user),
    isLoading,
    logout,
    setUser, // Добавляем setUser для обновления профиля
  };
};
