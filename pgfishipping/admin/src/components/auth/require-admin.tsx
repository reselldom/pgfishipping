'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, useAuthStore } from '@/lib/store/auth';

export function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    const api = useAuthStore as unknown as {
      persist?: {
        rehydrate: () => void | Promise<void>;
        hasHydrated: () => boolean;
      };
    };
    const p = api.persist;
    if (!p?.rehydrate) {
      useAuthStore.getState().setHydrated();
      return;
    }
    void p.rehydrate();
    const fallback = window.setTimeout(() => {
      if (!useAuthStore.getState().hydrated) {
        useAuthStore.getState().setHydrated();
      }
    }, 3000);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) {
      router.replace('/login');
      return;
    }
    if (!isAdmin(user)) {
      router.replace('/login?error=forbidden');
    }
  }, [user, accessToken, hydrated, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user || !accessToken || !isAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
