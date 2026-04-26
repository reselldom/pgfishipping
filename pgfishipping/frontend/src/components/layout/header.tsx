'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { LanguageSwitcher } from './language-switcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import { logout as apiLogout } from '@/lib/auth-api';
import { useRouter } from 'next/navigation';

export function Header(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout(): Promise<void> {
    await apiLogout();
    clear();
    router.push(`/${locale}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 text-lg font-bold text-primary"
        >
          <Package className="h-6 w-6" />
          <span>{tc('appName')}</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href={`/${locale}/track`} className="text-sm hover:text-primary">
            {t('track')}
          </Link>
          <Link
            href={`/${locale}/calculator`}
            className="text-sm hover:text-primary"
          >
            {t('calculator')}
          </Link>
          <Link
            href={`/${locale}/support`}
            className="text-sm hover:text-primary"
          >
            {t('support')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link href={`/${locale}/dashboard`}>
                <Button variant="ghost" size="sm">
                  {t('dashboard')}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {tc('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href={`/${locale}/login`}>
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href={`/${locale}/register`}>
                <Button size="sm">{t('register')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
