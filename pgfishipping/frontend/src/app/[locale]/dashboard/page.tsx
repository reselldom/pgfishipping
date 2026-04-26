'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Calculator as CalcIcon,
  BellPlus,
  Search,
  Wallet as WalletIcon,
  Plane,
  Ship,
  Truck,
  Home as HomeIcon,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import {
  getMyAddress,
  getWalletBalance,
  listShipments,
} from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import { StatusBadge } from '@/components/shipments/status-badge';
import type {
  ServiceType,
  Shipment,
  UsAddress,
  WalletBalance,
} from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED';

export default function DashboardOverviewPage(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const user = useAuthStore((s) => s.user);

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [_address, setAddress] = useState<UsAddress | null>(null);
  const [counts, setCounts] = useState({
    preAlerts: 0,
    active: 0,
    delivered: 0,
  });
  const [tab, setTab] = useState<Tab>('ACTIVE');
  const [items, setItems] = useState<Shipment[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [w, addr, pre, active, delivered] = await Promise.all([
          getWalletBalance(1, 1),
          getMyAddress(),
          listShipments('PRE_ALERTS', 1, 1),
          listShipments('ACTIVE', 1, 5),
          listShipments('DELIVERED', 1, 1),
        ]);
        if (!mounted) return;
        setWallet(w);
        setAddress(addr);
        setCounts({
          preAlerts: pre.total,
          active: active.total,
          delivered: delivered.total,
        });
        setItems(active.items);
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    let mounted = true;
    setTabLoading(true);
    listShipments(tab, 1, 5)
      .then((r) => {
        if (mounted) setItems(r.items);
      })
      .finally(() => {
        if (mounted) setTabLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tab, loading]);

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const validUntilLabel = validUntil.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const filteredItems = search
    ? items.filter((s) =>
        [
          s.trackingCode,
          s.externalTracking,
          s.contentsDescription,
          s.vendor,
          s.recipientName,
        ]
          .filter(Boolean)
          .some((field) =>
            (field as string).toLowerCase().includes(search.toLowerCase()),
          ),
      )
    : items;

  return (
    <div className="space-y-6">
      {/* WELCOME HERO BANNER */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: greeting + customer code + points */}
          <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('welcomeBanner')}
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-brand-red">
                {user
                  ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                  : ''}
              </h1>
              <p className="mt-0.5 font-mono text-base font-semibold text-brand-navy">
                {user?.customerCode}
              </p>
            </div>

            <div className="rounded-lg border-2 border-brand-red bg-card p-4 text-center sm:min-w-[180px]">
              <div className="text-xs font-medium text-foreground">
                {t('balancePoints')}
              </div>
              <div className="mt-0.5 text-2xl font-extrabold text-brand-navy">
                {wallet ? wallet.balanceUsd.toFixed(2) : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                USD
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {t('validUntil')}{' '}
                <span className="font-semibold text-foreground">
                  {validUntilLabel}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <span>{t('referrals')}:</span>
                <span className="font-semibold text-foreground">0/0</span>
              </div>
            </div>
          </div>

          {/* Right: quick action tiles */}
          <div className="border-t border-border/60 p-6 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4 text-brand-navy" />
              {t('quickActions')}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <QuickAction
                href={`/${locale}/calculator`}
                color="navy"
                icon={<CalcIcon className="h-5 w-5" />}
                label={t('qaCalculator')}
              />
              <QuickAction
                href={`/${locale}/dashboard/pre-alert`}
                color="navy"
                icon={<BellPlus className="h-5 w-5" />}
                label={t('qaPreAlert')}
              />
              <QuickAction
                href={`/${locale}/track`}
                color="navy"
                icon={<Search className="h-5 w-5" />}
                label={t('qaTrack')}
              />
              <QuickAction
                href={`/${locale}/dashboard/wallet`}
                color="green"
                badge={counts.preAlerts > 0 ? counts.preAlerts : undefined}
                icon={<WalletIcon className="h-5 w-5" />}
                label={t('qaWallet')}
              />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* TAB CHIPS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-muted-foreground">
            {t('searchLabel')}
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-9 w-72 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/40"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <TabChip
            active={tab === 'PRE_ALERTS'}
            onClick={() => setTab('PRE_ALERTS')}
            icon={<BellPlus className="h-4 w-4" />}
            label={t('preAlerts')}
            count={counts.preAlerts}
          />
          <TabChip
            active={tab === 'ACTIVE'}
            onClick={() => setTab('ACTIVE')}
            icon={<Plane className="h-4 w-4" />}
            label={t('active')}
            count={counts.active}
          />
          <TabChip
            active={tab === 'DELIVERED'}
            onClick={() => setTab('DELIVERED')}
            icon={<HomeIcon className="h-4 w-4" />}
            label={t('delivered')}
            count={counts.delivered}
          />
        </div>
      </div>

      {/* SHIPMENTS TABLE */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Contents</th>
                <th className="px-4 py-3 text-right">Weight</th>
                <th className="px-4 py-3 text-right">FOB</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tabLoading || loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {/* loading */}
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-navy border-r-transparent align-middle" />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t('noShipmentsHere')}
                  </td>
                </tr>
              ) : (
                filteredItems.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <ServiceIcon service={s.serviceType} />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <Link
                        href={`/${locale}/dashboard/shipments/${s.id}`}
                        className="font-semibold text-brand-navy hover:underline"
                      >
                        {s.trackingCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{s.recipientName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[18ch] truncate">
                        {s.contentsDescription || s.vendor || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.weightLbs ? `${s.weightLbs.toFixed(2)} LBS` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.fobValue !== null ? s.fobValue.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy"
                          title={t('iconHomeAddress')}
                        >
                          <HomeIcon className="h-3.5 w-3.5" />
                        </span>
                        <Link
                          href={`/${locale}/dashboard/shipments/${s.id}`}
                          className="inline-flex h-7 items-center justify-center rounded-md bg-amber-500 px-2.5 text-xs font-bold text-white hover:bg-amber-600"
                          title="View details"
                        >
                          $
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* footer with view-all */}
        <div className="flex items-center justify-between border-t bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-brand-navy/15 text-brand-navy">
                <HomeIcon className="h-3 w-3" />
              </span>
              {t('iconHomeAddress')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-brand-red" />
              {t('infoLast180')}
            </span>
          </div>
          <Link
            href={`/${locale}/dashboard/shipments?tab=${tab}`}
            className="inline-flex items-center gap-1 font-medium text-brand-navy hover:underline"
          >
            {t('viewAll')} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  color,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: 'navy' | 'red' | 'green';
  badge?: number;
}): JSX.Element {
  const palette = {
    navy: 'bg-brand-navy text-white hover:bg-brand-navy/90',
    red: 'bg-brand-red text-white hover:bg-brand-red/90',
    green: 'bg-emerald-500 text-white hover:bg-emerald-600',
  } as const;
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-center transition-colors',
        palette[color],
      )}
    >
      {badge !== undefined && badge > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white shadow">
          {badge}
        </span>
      ) : null}
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}

function TabChip({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-brand-navy bg-brand-navy text-white shadow-sm'
          : 'border-border bg-card text-foreground hover:border-brand-navy hover:text-brand-navy',
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined ? (
        <span
          className={cn(
            'ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]',
            active
              ? 'bg-white/20 text-white'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ServiceIcon({ service }: { service: ServiceType }): JSX.Element {
  const map = {
    AIR: { Icon: Plane, color: 'bg-brand-navy' },
    SEA: { Icon: Ship, color: 'bg-brand-red' },
    EXPRESS: { Icon: Truck, color: 'bg-amber-500' },
  } as const;
  const { Icon, color } = map[service] ?? map.AIR;
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-white',
        color,
      )}
      aria-label={service}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
