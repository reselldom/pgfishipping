'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plane,
  Ship,
  Truck,
  BellPlus,
  Home as HomeIcon,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shipments/status-badge';
import { listShipments } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import type { Shipment, ServiceType } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED';

const TABS: { id: Tab; key: 'tabPreAlerts' | 'tabActive' | 'tabDelivered'; Icon: typeof Plane }[] =
  [
    { id: 'PRE_ALERTS', key: 'tabPreAlerts', Icon: BellPlus },
    { id: 'ACTIVE', key: 'tabActive', Icon: Plane },
    { id: 'DELIVERED', key: 'tabDelivered', Icon: HomeIcon },
  ];

export default function ShipmentsListPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="text-sm">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner(): JSX.Element {
  const t = useTranslations('shipmentsList');
  const td = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const tabParam = (params.get('tab') as Tab | null) ?? 'ACTIVE';
  const pageParam = parseInt(params.get('page') ?? '1', 10);
  const searchParam = params.get('q') ?? '';

  const [tab, setTab] = useState<Tab>(tabParam);
  const [page, setPage] = useState<number>(pageParam);
  const [search, setSearch] = useState<string>(searchParam);
  const [items, setItems] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listShipments(tab, page, pageSize, searchParam || undefined)
      .then((r) => {
        if (!mounted) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((err) => {
        if (mounted) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tab, page, pageSize, searchParam]);

  function changeTab(id: Tab): void {
    setTab(id);
    setPage(1);
    const usp = new URLSearchParams(params);
    usp.set('tab', id);
    usp.set('page', '1');
    router.replace(`/${locale}/dashboard/shipments?${usp.toString()}`);
  }

  function changePage(p: number): void {
    setPage(p);
    const usp = new URLSearchParams(params);
    usp.set('page', String(p));
    router.replace(`/${locale}/dashboard/shipments?${usp.toString()}`);
  }

  function submitSearch(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
    const usp = new URLSearchParams(params);
    if (search) usp.set('q', search);
    else usp.delete('q');
    usp.set('page', '1');
    router.replace(`/${locale}/dashboard/shipments?${usp.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 text-sm"
        >
          <span className="font-medium text-muted-foreground">
            {td('searchLabel')}
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={td('searchPlaceholder')}
              className="h-9 w-72 rounded-md border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/40"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            {t('search')}
          </Button>
        </form>

        <div className="flex gap-2">
          {TABS.map(({ id, key, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeTab(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === id
                  ? 'border-brand-navy bg-brand-navy text-white shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-brand-navy hover:text-brand-navy',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t(key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {error ? (
          <div className="border-b bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">{t('trackingCode')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('created')}</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Contents</th>
                <th className="px-4 py-3 text-right">{t('weight')}</th>
                <th className="px-4 py-3 text-right">FOB</th>
                <th className="px-4 py-3 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-navy border-r-transparent align-middle" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {t('noResults')}
                  </td>
                </tr>
              ) : (
                items.map((s) => (
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
                      {s.externalTracking ? (
                        <div className="text-[11px] text-muted-foreground">
                          {s.externalTracking}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{s.recipientName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[20ch] truncate">
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
                          title={td('iconHomeAddress')}
                        >
                          <HomeIcon className="h-3.5 w-3.5" />
                        </span>
                        <Link
                          href={`/${locale}/dashboard/shipments/${s.id}`}
                          className="inline-flex h-7 items-center justify-center rounded-md bg-amber-500 px-2.5 text-xs font-bold text-white hover:bg-amber-600"
                          title={t('view')}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-brand-navy/15 text-brand-navy">
                <HomeIcon className="h-3 w-3" />
              </span>
              {td('iconHomeAddress')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-brand-red" />
              {td('infoLast180')}
            </span>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t('page', { page, total: totalPages })}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                ‹
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                ›
              </Button>
              <Link
                href={`/${locale}/dashboard`}
                className="inline-flex items-center gap-1 font-medium text-brand-navy hover:underline"
              >
                {t('view')} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
