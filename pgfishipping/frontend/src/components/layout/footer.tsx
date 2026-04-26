'use client';

import { useTranslations } from 'next-intl';

export function Footer(): JSX.Element {
  const t = useTranslations('common');
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground md:flex-row">
        <span>
          © {new Date().getFullYear()} {t('appName')}
        </span>
        <span>{t('tagline')}</span>
      </div>
    </footer>
  );
}
