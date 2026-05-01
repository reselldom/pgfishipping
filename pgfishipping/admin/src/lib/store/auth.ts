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

function ssrSafeLocalStorage(): Storage {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      key: () => null,
      length: 0,
      clear: () => {},
    } as unknown as Storage;
  }
  return window.localStorage;
}

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (user: AdminUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setSession: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'pgfi-admin-auth',
      // Next.js runs this module on the server where `localStorage` does not exist.
      // A fake Storage keeps persist from disabling itself; real localStorage is used on the client.
      storage: createJSONStorage(() => ssrSafeLocalStorage()),
      // Rehydrate only in the browser (see RequireAdmin) so the finish callback always runs on the client.
      skipHydration: true,
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (_slice, error) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('Admin auth storage rehydrate error', error);
        }
        useAuthStore.getState().setHydrated();
      },
    },
  ),
);

export function isAdmin(u: AdminUser | null): boolean {
  if (!u) return false;
  return u.role === 'SUPER_ADMIN' || u.role === 'MANAGER' || u.role === 'STAFF';
}
