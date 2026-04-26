import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
}

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setSession: (user: AdminUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      setSession: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'pgfi-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function isAdmin(u: AdminUser | null): boolean {
  if (!u) return false;
  return u.role === 'SUPER_ADMIN' || u.role === 'MANAGER' || u.role === 'STAFF';
}
