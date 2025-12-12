import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout: logoutStore } = useAuthStore();
  const queryClient = useQueryClient();

  // Используем единый React Query запрос для партнера с дедупликацией
  // Этот ключ используется везде, чтобы избежать дублирования запросов
  const { data: partnerData, isLoading: isPartnerLoading } = useQuery({
    queryKey: ['currentPartner'],
    queryFn: async () => {
      try {
        const response = await authApi.getCurrentPartner();
        return response?.data;
      } catch (error: any) {
        // Тихая ошибка - используем сохраненные данные из localStorage
        const savedUser = localStorage.getItem('partner_user');
        if (savedUser) {
          try {
            return JSON.parse(savedUser);
          } catch (e) {
            return null;
          }
        }
        return null;
      }
    },
    enabled: !!localStorage.getItem('partner_token'),
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
    retry: 1,
    refetchOnMount: false, // Не перезапрашивать при каждом монтировании
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // React Query автоматически дедуплицирует запросы с одинаковым queryKey
    // Все компоненты, использующие ['currentPartner'], будут получать одни и те же данные
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('partner_token');
      const savedUser = localStorage.getItem('partner_user');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Если есть сохраненный пользователь, используем его сразу (мгновенная загрузка UI)
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setLoading(false);
        } catch (e) {
          console.warn('Failed to parse saved user:', e);
        }
      } else {
        setLoading(false);
      }

      // React Query автоматически обновит данные, если они изменились
    };

    checkAuth();
  }, [setUser, setLoading]);

  // Синхронизируем данные из React Query с store
  useEffect(() => {
    if (partnerData) {
      const userData = {
        id: partnerData.id?.toString() || '1',
        email: partnerData.email || partnerData.username || 'partner@yess.kg',
        username: partnerData.username || partnerData.name || partnerData.first_name || 'Partner',
        role: partnerData.role || 'partner',
        avatar_url: partnerData.avatar_url,
      };
      setUser(userData);
      localStorage.setItem('partner_user', JSON.stringify(userData));
    }
  }, [partnerData, setUser]);

  // Обертка для logout с очисткой кэша
  const logout = () => {
    logoutStore();
    // Очищаем все запросы из кэша
    queryClient.clear();
    // Удаляем данные партнера из кэша
    queryClient.removeQueries({ queryKey: ['currentPartner'] });
    queryClient.removeQueries({ queryKey: ['dashboardStats'] });
  };

  const tokenExists = !!localStorage.getItem('partner_token');
  
  return {
    user,
    isAuthenticated: tokenExists && (isAuthenticated || !!user),
    isLoading,
    logout,
    setUser,
  };
};

