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
