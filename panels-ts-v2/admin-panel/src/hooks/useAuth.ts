import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

// Глобальный флаг для предотвращения множественных запросов
let globalCheckInProgress = false;
// Время последней ошибки 500 - блокируем повторные попытки на 30 секунд
let last500ErrorTime = 0;
const ERROR_500_BACKOFF = 30 * 1000; // 30 секунд

export const useAuth = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isChecking,
    lastCheckTime,
    rateLimitUntil,
    setUser, 
    setLoading, 
    setChecking,
    setLastCheckTime,
    setRateLimitUntil,
    logout 
  } = useAuthStore();
  
  const hasCheckedRef = useRef(false);
  const checkAuthRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Если пользователь уже проверен недавно (5 минут), не делаем запрос
      if (user && lastCheckTime && Date.now() - lastCheckTime < 5 * 60 * 1000) {
        console.log('📋 useAuth: Пользователь проверен недавно, пропускаем');
        setLoading(false);
        return;
      }

      // Если уже выполняется проверка, не запускаем новую
      if (isChecking || globalCheckInProgress) {
        console.log('⏳ useAuth: Проверка уже выполняется');
        return;
      }

      // Rate limit проверка
      if (rateLimitUntil && Date.now() < rateLimitUntil) {
        console.log('🚫 useAuth: Rate limit активен');
        setLoading(false);
        return;
      }

      // Блокируем повторные попытки после ошибки 500 на 30 секунд
      if (last500ErrorTime > 0 && Date.now() - last500ErrorTime < ERROR_500_BACKOFF) {
        const remaining = Math.ceil((ERROR_500_BACKOFF - (Date.now() - last500ErrorTime)) / 1000);
        console.log(`🚫 useAuth: Блокировка после ошибки 500. Повтор через ${remaining} сек.`);
        setLoading(false);
        return;
      }

      // Если уже выполняется проверка, не запускаем новую
      if (isChecking) {
        return;
      }

      console.log('🔍 useAuth: Начинаем проверку пользователя...');
      hasCheckedRef.current = true;
      globalCheckInProgress = true;
      setChecking(true);
      setLoading(true);

      try {
        const response = await authApi.getCurrentUser();
        console.log('✅ useAuth: Получен ответ от API:', response);

        // authApi.getCurrentUser возвращает ApiResponse, поэтому извлекаем data при наличии
        const payload: any = (response as any)?.data ?? response;

        if (payload) {
          const userData = {
            id: payload.id?.toString() || '',
            email: payload.email || payload.phone || '',
            role: 'admin' as const,
            username: payload.email || payload.phone,
            avatar_url: payload.avatar_url,
            firstName: payload.firstName,
            lastName: payload.lastName,
          };
          console.log('👤 useAuth: Устанавливаем пользователя:', userData);
          setUser(userData);
          setLastCheckTime(Date.now());
        } else {
          console.log('❌ useAuth: Ответ API пустой');
          setUser(null);
        }
      } catch (error: any) {
        console.error('❌ useAuth: Ошибка при проверке пользователя:', error);
        const status = error?.response?.status;
        console.log('📊 useAuth: Код ошибки:', status);

        if (status === 429) {
          console.log('⏰ useAuth: Rate limit достигнут');
          setRateLimitUntil(Date.now() + 60 * 1000);
        } else if (status === 500) {
          // Ошибка 500 - блокируем повторные попытки на 30 секунд
          console.log('🚫 useAuth: Ошибка 500 - блокируем повторные попытки на 30 секунд');
          last500ErrorTime = Date.now();
          if (!user) setUser(null);
        } else if (error?.code === 'ERR_NETWORK' || status === 401) {
          console.log('🚫 useAuth: Токен невалиден');
          localStorage.removeItem('admin_token');
          setUser(null);
        } else {
          console.log('⚠️ useAuth: Другая ошибка');
          if (!user) setUser(null);
        }
      } finally {
        setLoading(false);
        setChecking(false);
        globalCheckInProgress = false;
      }
    };

    // Сохраняем функцию для возможного повторного использования
    checkAuthRef.current = checkAuth;

    // Проверяем только один раз при монтировании
    if (!hasCheckedRef.current) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполняется только один раз

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      globalCheckInProgress = false;
    };
  }, []);

  const tokenExists = !!localStorage.getItem('admin_token');
  
  return {
    user,
    isAuthenticated: tokenExists && !!user,
    isLoading,
    logout,
    setUser, // Добавляем setUser для обновления профиля
  };
};
