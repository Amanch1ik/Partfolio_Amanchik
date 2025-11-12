import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Если токен есть, устанавливаем базового пользователя сразу
      // Попытка получить данные с сервера (опционально, не блокируем)
      setUser({
        id: '1',
        email: 'admin@yess.kg',
        role: 'admin',
      });
      setLoading(false);

      // Параллельно пытаемся получить данные с сервера (не блокируем UI)
      authApi.getCurrentAdmin().then((response: any) => {
        if (response?.data) {
          setUser({
            id: response.data.id?.toString() || '1',
            email: response.data.email || response.data.username || 'admin@yess.kg',
            role: response.data.role || 'admin',
          });
        }
      }).catch((error) => {
        // Игнорируем ошибки - уже установили базового пользователя
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
