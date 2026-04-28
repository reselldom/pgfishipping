import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ColorCard } from '@/components/brand/color-card';

export default function AboutPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('about');
  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          PGFI Shipping
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-base text-pg-muted">{t('intro')}</p>
      </div>

      <ColorCard tone="navy" title={t('missionTitle')}>
        <p className="text-sm text-pg-ink">{t('mission')}</p>
      </ColorCard>

      <ColorCard tone="red" title={t('valuesTitle')}>
        <ul className="list-inside list-disc space-y-1 text-sm text-pg-ink">
          <li>{t('v1')}</li>
          <li>{t('v2')}</li>
          <li>{t('v3')}</li>
        </ul>
      </ColorCard>
    </div>
  );
}
