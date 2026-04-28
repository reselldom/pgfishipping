'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';

export function Footer(): JSX.Element {
  const t = useTranslations('common');
  const tn = useTranslations('nav');
  const locale = useLocale();
  return (
    <footer className="mt-auto bg-pg-navy text-white/90">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.2fr_2fr] md:py-12">
        <div>
          <Logo size="md" wordmark monochrome className="text-white" />
          <p className="mt-3 max-w-xs text-sm text-white/70">{t('tagline')}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Link
            href={`/${locale}/track`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('track')}
          </Link>
          <Link
            href={`/${locale}/calculator`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('calculator')}
          </Link>
          <Link
            href={`/${locale}/addresses`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('addresses')}
          </Link>
          <Link
            href={`/${locale}/support`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('support')}
          </Link>
          <Link
            href={`/${locale}/about`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('about')}
          </Link>
          <Link
            href={`/${locale}/terms`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('terms')}
          </Link>
          <Link
            href={`/${locale}/privacy`}
            className="text-white/80 transition-colors hover:text-pg-orange"
          >
            {tn('privacy')}
          </Link>
        </nav>
      </div>
      <div className="brand-stripe-bottom h-1.5" aria-hidden />
      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} {t('appName')}
        </div>
      </div>
    </footer>
  );
}
