import { create } from 'zustand';

interface PartnerUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
}

interface AuthState {
  user: PartnerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: PartnerUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    localStorage.removeItem('partner_token');
    set({ user: null, isAuthenticated: false });
  },
}));

