import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  setAuthState: (state: {
    isAuthenticated?: boolean;
    user?: User | null;
    loading?: boolean;
    error?: string | null;
  }) => void;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed values
  isAdmin: () => boolean;
  isDriver: () => boolean;
  isStudent: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      loading: true,
      error: null,

      // Actions
      setAuthState: state =>
        set(prev => ({
          ...prev,
          ...state,
        })),

      setUser: user =>
        set(() => ({
          user,
          isAuthenticated: !!user,
        })),

      setLoading: loading => set({ loading }),

      setError: error => set({ error }),

      clearError: () => set({ error: null }),

      // Computed values
      isAdmin: () => {
        const state = get();
        return state.user?.role === 'admin';
      },

      isDriver: () => {
        const state = get();
        return state.user?.role === 'driver';
      },

      isStudent: () => {
        const state = get();
        return state.user?.role === 'student';
      },
    }),
    {
      name: 'auth-store',
    }
  )
);
