'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export function Footer(): JSX.Element {
  const t = useTranslations('common');
  const tn = useTranslations('nav');
  const locale = useLocale();
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-semibold text-primary">{t('appName')}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t('tagline')}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Link href={`/${locale}/track`} className="hover:text-primary">
            {tn('track')}
          </Link>
          <Link href={`/${locale}/calculator`} className="hover:text-primary">
            {tn('calculator')}
          </Link>
          <Link href={`/${locale}/addresses`} className="hover:text-primary">
            {tn('addresses')}
          </Link>
          <Link href={`/${locale}/support`} className="hover:text-primary">
            {tn('support')}
          </Link>
          <Link href={`/${locale}/about`} className="hover:text-primary">
            {tn('about')}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-primary">
            {tn('terms')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-primary">
            {tn('privacy')}
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t('appName')}
        </div>
      </div>
    </footer>
  );
}
