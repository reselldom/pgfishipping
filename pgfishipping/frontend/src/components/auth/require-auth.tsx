'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/store/auth';

export function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element | null {
  const router = useRouter();
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !accessToken) {
      router.replace(`/${locale}/login`);
    }
  }, [hydrated, user, accessToken, router, locale]);

  if (!hydrated) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user || !accessToken) return null;
  return <>{children}</>;
}
