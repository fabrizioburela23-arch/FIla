import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  accountId: string;
  email: string;
  role: string;
  fullName: string;
  /** Legacy / operator fields */
  name?: string;
  operatorId?: string;
  branchId?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      // Key must match the one used by the axios interceptor: 'fila_token'
      name: 'fila_token',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
