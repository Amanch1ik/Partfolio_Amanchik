import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('partner_token');
      const savedUser = localStorage.getItem('partner_user');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Если есть сохраненный пользователь, используем его сразу
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setLoading(false);
        } catch (e) {
          console.warn('Failed to parse saved user:', e);
        }
      }

      // Пытаемся получить данные с сервера в фоне (не блокируем UI)
      // Используем короткий таймаут, чтобы не задерживать загрузку
      const fetchUserData = async () => {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 2000); // Уменьшен таймаут
          });

          const response = await Promise.race([
            authApi.getCurrentPartner(),
            timeoutPromise,
          ]) as any;

          if (response?.data) {
            const userData = {
              id: response.data.id?.toString() || '1',
              email: response.data.email || response.data.username || 'partner@yess.kg',
              username: response.data.username || response.data.name || response.data.first_name || 'Partner',
              role: response.data.role || 'partner',
              avatar_url: response.data.avatar_url,
            };
            setUser(userData);
            localStorage.setItem('partner_user', JSON.stringify(userData));
          }
        } catch (error: any) {
          // Тихая ошибка - не логируем в консоль, просто используем сохраненные данные
          // Это нормально, если сервер недоступен или endpoint не существует
          if (savedUser) {
            // Уже есть сохраненный пользователь, ничего не делаем
            return;
          }
          
          // Если нет сохраненного пользователя, создаем базового из токена
          // Парсим токен, чтобы получить user_id (если возможно)
          try {
            const token = localStorage.getItem('partner_token');
            if (token) {
              // Пытаемся извлечь данные из токена (JWT)
              const payload = JSON.parse(atob(token.split('.')[1]));
              const userId = payload.sub || '1';
              
              const defaultUser = {
                id: userId,
                email: 'partner@yess.kg',
                username: 'Partner',
                role: 'partner',
              };
              setUser(defaultUser);
              localStorage.setItem('partner_user', JSON.stringify(defaultUser));
            }
          } catch (e) {
            // Если не удалось распарсить токен, используем дефолтные значения
            const defaultUser = {
              id: '1',
              email: 'partner@yess.kg',
              username: 'Partner',
              role: 'partner',
            };
            setUser(defaultUser);
            localStorage.setItem('partner_user', JSON.stringify(defaultUser));
          }
        }
      };

      // Запускаем в фоне, не ждем результата
      fetchUserData();
      
      // Сразу устанавливаем loading в false, чтобы не блокировать UI
      setLoading(false);
    };

    checkAuth();
  }, [setUser, setLoading]);

  const tokenExists = !!localStorage.getItem('partner_token');
  
  return {
    user,
    isAuthenticated: tokenExists && (isAuthenticated || !!user),
    isLoading,
    logout,
    setUser,
  };
};

