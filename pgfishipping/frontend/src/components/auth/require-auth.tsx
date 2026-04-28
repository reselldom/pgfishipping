'use client';

import { useEffect, useState } from 'react';
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

  // Explicitly drive the persist rehydrate so we don't depend on the
  // onRehydrateStorage callback firing in the right order with React mounts.
  // This handles both: page-load-after-login (cold) and SPA navigation (warm).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const persistApi = (
          useAuthStore as unknown as {
            persist?: { rehydrate?: () => Promise<void> | void };
          }
        ).persist;
        await persistApi?.rehydrate?.();
      } catch {
        // ignore: we still want to flip ready and let the auth check run
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user || !accessToken) {
      router.replace(`/${locale}/login`);
    }
  }, [ready, user, accessToken, router, locale]);

  if (!ready) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user || !accessToken) return null;
  return <>{children}</>;
}
