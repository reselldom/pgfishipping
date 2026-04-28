'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from './language-switcher';
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* Liberty-style flag accent stripe */}
      <div className="brand-stripe-top h-1.5" aria-hidden />
      <div className="container flex min-h-[5rem] items-center justify-between py-2">
        <Link href={`/${locale}`} aria-label={tc('appName')} className="flex items-center">
          <Logo size="lg" />
        </Link>
        <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href={`/${locale}/track`}
              className="text-sm font-semibold text-pg-navy/80 transition-colors hover:text-pg-orange"
            >
              {t('track')}
            </Link>
            <Link
              href={`/${locale}/calculator`}
              className="text-sm font-semibold text-pg-navy/80 transition-colors hover:text-pg-orange"
            >
              {t('calculator')}
            </Link>
            <Link
              href={`/${locale}/addresses`}
              className="text-sm font-semibold text-pg-navy/80 transition-colors hover:text-pg-orange"
            >
              {t('addresses')}
            </Link>
            <Link
              href={`/${locale}/support`}
              className="text-sm font-semibold text-pg-navy/80 transition-colors hover:text-pg-orange"
            >
              {t('support')}
            </Link>
          </nav>
          <LanguageSwitcher />
          <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
