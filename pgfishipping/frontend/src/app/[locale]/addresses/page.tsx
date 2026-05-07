import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  ArrowRight,
  Info,
  Mail,
  MapPin,
  Phone,
  Plane,
  Ship,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorCard } from '@/components/brand/color-card';
import {
  fetchPublicFooterContent,
  fetchPublicWarehouses,
  type FooterPhoneLine,
  type PublicFooterContent,
  type PublicWarehouse,
} from '@/lib/public-api';
import { phoneForWarehouseRow, telHref } from '@/lib/contact-display';

export const dynamic = 'force-dynamic';

function formatLine(w: PublicWarehouse): string {
  const parts = [w.address, w.city];
  const tail = [w.state, w.country].filter((v): v is string => Boolean(v));
  if (tail.length) parts.push(tail.join(', '));
  return parts.join(', ');
}

/** Prefer Super Admin → Footer → USA block for the address line in A/B format cards. */
function usLineForCards(warehouseLine: string, footer: PublicFooterContent): string {
  const detail = footer.usaLocations[0]?.detail?.trim();
  if (detail) {
    return detail.split(/\n/).map((s) => s.trim()).filter(Boolean).join(', ');
  }
  return warehouseLine;
}

export default async function AddressesPage({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<JSX.Element> {
  setRequestLocale(locale);
  const [warehouses, footer] = await Promise.all([
    fetchPublicWarehouses(),
    fetchPublicFooterContent(),
  ]);
  return (
    <AddressesView locale={locale} warehouses={warehouses} footer={footer} />
  );
}

function AddressesView({
  locale,
  warehouses,
  footer,
}: {
  locale: string;
  warehouses: PublicWarehouse[];
  footer: PublicFooterContent;
}): JSX.Element {
  const t = useTranslations('addresses');
  const usWarehouses = warehouses.filter((w) => w.type === 'US');
  const haitiBranches = warehouses.filter((w) => w.type === 'HT');

  const primaryUs = usWarehouses[0];
  const warehousePrimaryLine = primaryUs ? formatLine(primaryUs) : t('miamiAddress');
  const primaryUsLine = usLineForCards(warehousePrimaryLine, footer);

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          {t('subtitle')}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('title')}
        </h1>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-pg-mint/30 bg-pg-mint-50 p-4 text-sm text-pg-ink">
        <Info className="mt-0.5 h-5 w-5 flex-none text-pg-mint" />
        <span>{t('tip')}</span>
      </div>

      {footer.phones.length > 0 || footer.email ? (
        <ColorCard
          tone="red"
          icon={<Phone className="h-4 w-4" />}
          title={t('contactSameAsFooter')}
        >
          <ul className="space-y-2 text-sm">
            {footer.phones.map((line, idx) => (
              <li key={`${line.number}-${idx}`}>
                <a
                  href={telHref(line.number)}
                  className="inline-flex items-center gap-2 font-semibold text-pg-ink hover:text-pg-orange"
                >
                  <Phone className="h-4 w-4 text-pg-navy" />
                  <span>
                    {line.label ? (
                      <span className="mr-1 text-xs text-pg-muted">{line.label}: </span>
                    ) : null}
                    <span className="num">{line.number}</span>
                  </span>
                </a>
              </li>
            ))}
            {footer.email ? (
              <li>
                <a
                  href={`mailto:${footer.email}`}
                  className="inline-flex items-center gap-2 font-semibold text-pg-ink hover:text-pg-orange"
                >
                  <Mail className="h-4 w-4 text-pg-navy" />
                  {footer.email}
                </a>
              </li>
            ) : null}
          </ul>
          <p className="mt-2 text-xs text-pg-muted">{t('footerContactHint')}</p>
        </ColorCard>
      ) : null}

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
            <p className="num text-pg-ink">{primaryUsLine}</p>
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
            <p className="num text-pg-ink">{primaryUsLine}</p>
            <p className="text-pg-muted">{t('fmtCountry')}</p>
          </div>
        </ColorCard>
      </div>

      <ColorCard
        tone="navy"
        icon={<Warehouse className="h-4 w-4" />}
        title={t('warehouses')}
      >
        {usWarehouses.length === 0 ? (
          <div className="py-2 text-sm text-pg-muted">{primaryUsLine}</div>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm">
            {usWarehouses.map((w) => (
              <WarehouseRow key={w.id} w={w} footerPhones={footer.phones} />
            ))}
          </ul>
        )}
      </ColorCard>

      {haitiBranches.length > 0 ? (
        <ColorCard
          tone="red"
          icon={<MapPin className="h-4 w-4" />}
          title={t('haitiBranches')}
        >
          <ul className="divide-y divide-slate-200 text-sm">
            {haitiBranches.map((w) => (
              <WarehouseRow key={w.id} w={w} footerPhones={footer.phones} />
            ))}
          </ul>
        </ColorCard>
      ) : null}

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

function WarehouseRow({
  w,
  footerPhones,
}: {
  w: PublicWarehouse;
  footerPhones: FooterPhoneLine[];
}): JSX.Element {
  const displayPhone = phoneForWarehouseRow(w.phone, footerPhones);
  return (
    <li className="space-y-1 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-bold text-pg-navy">{w.name}</span>
        <span className="num text-pg-muted">{formatLine(w)}</span>
      </div>
      {displayPhone || w.email ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-pg-muted">
          {displayPhone ? (
            <a
              href={telHref(displayPhone)}
              className="inline-flex items-center gap-1 text-pg-ink hover:text-pg-orange"
            >
              <Phone className="h-3 w-3" />
              <span className="num">{displayPhone}</span>
            </a>
          ) : null}
          {w.email ? (
            <a
              href={`mailto:${w.email}`}
              className="inline-flex items-center gap-1 hover:text-pg-navy"
            >
              <Mail className="h-3 w-3" />
              <span>{w.email}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
