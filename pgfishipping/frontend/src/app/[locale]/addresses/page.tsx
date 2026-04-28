import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ArrowRight, Info, Plane, Ship, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorCard } from '@/components/brand/color-card';

export default function AddressesPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('addresses');
  return (
    <div className="container max-w-4xl space-y-8 py-12">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          {t('subtitle')}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('title')}
        </h1>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-pg-mint/30 bg-pg-mint-50 p-4 text-sm text-pg-ink">
        <Info className="mt-0.5 h-5 w-5 flex-none text-pg-mint" />
        <span>{t('tip')}</span>
      </div>

      {/* Plane (navy) + Boat (red) Liberty/Shippex pattern */}
      <div className="grid gap-4 md:grid-cols-2">
        <ColorCard
          tone="navy"
          icon={<Plane className="h-4 w-4" />}
          title="Plane / Air"
        >
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-pg-ink">
              {t('fmtName')}{' '}
              <span className="num text-pg-orange">/HT-XXXXXX/A</span>
            </p>
            <p className="num text-pg-ink">{t('miamiAddress')}</p>
            <p className="text-pg-muted">{t('fmtCountry')}</p>
          </div>
        </ColorCard>

        <ColorCard
          tone="red"
          icon={<Ship className="h-4 w-4" />}
          title="Boat / Sea"
        >
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-pg-ink">
              {t('fmtName')}{' '}
              <span className="num text-pg-orange">/HT-XXXXXX/B</span>
            </p>
            <p className="num text-pg-ink">{t('miamiAddress')}</p>
            <p className="text-pg-muted">{t('fmtCountry')}</p>
          </div>
        </ColorCard>
      </div>

      {/* Warehouses list */}
      <ColorCard
        tone="navy"
        icon={<Warehouse className="h-4 w-4" />}
        title={t('warehouses')}
      >
        <div className="divide-y divide-slate-200 text-sm">
          <div className="flex items-baseline justify-between gap-3 py-2">
            <span className="font-bold text-pg-navy">{t('miami')}</span>
            <span className="num text-pg-muted">{t('miamiAddress')}</span>
          </div>
        </div>
      </ColorCard>

      {/* CTA */}
      <div className="flex justify-center">
        <Link href={`/${locale}/register`}>
          <Button size="lg">
            {t('ctaSignup')} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
