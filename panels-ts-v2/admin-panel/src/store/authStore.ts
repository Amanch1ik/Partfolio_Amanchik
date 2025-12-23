import { create } from 'zustand';
import { AdminUser } from '@/types';

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isChecking: boolean; // Флаг для отслеживания выполнения запроса
  lastCheckTime: number; // Время последней проверки
  rateLimitUntil: number; // Время до которого заблокированы запросы из-за rate limit
  setUser: (user: AdminUser | null) => void;
  setLoading: (loading: boolean) => void;
  setChecking: (checking: boolean) => void;
  setLastCheckTime: (time: number) => void;
  setRateLimitUntil: (time: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isChecking: false,
  lastCheckTime: 0,
  rateLimitUntil: 0,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setChecking: (checking) => set({ isChecking: checking }),
  setLastCheckTime: (time) => set({ lastCheckTime: time }),
  setRateLimitUntil: (time) => set({ rateLimitUntil: time }),
  logout: () => {
    localStorage.removeItem('admin_token');
    set({ user: null, isAuthenticated: false, lastCheckTime: 0, rateLimitUntil: 0 });
  },
}));
