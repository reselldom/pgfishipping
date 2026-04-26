'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shipments/status-badge';
import { listShipments } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import type { Shipment } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED';

const TABS: { id: Tab; key: 'tabPreAlerts' | 'tabActive' | 'tabDelivered' }[] =
  [
    { id: 'PRE_ALERTS', key: 'tabPreAlerts' },
    { id: 'ACTIVE', key: 'tabActive' },
    { id: 'DELIVERED', key: 'tabDelivered' },
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
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border bg-card p-1">
          {TABS.map(({ id, key }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeTab(id)}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(key)}
            </button>
          ))}
        </div>

        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              className="pl-8 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            {t('search')}
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="border-b bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t('noResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t('trackingCode')}</th>
                    <th className="px-4 py-3">{t('service')}</th>
                    <th className="px-4 py-3">{t('weight')}</th>
                    <th className="px-4 py-3">{t('status')}</th>
                    <th className="px-4 py-3">{t('created')}</th>
                    <th className="px-4 py-3 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((s) => (
                    <tr key={s.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-medium">{s.trackingCode}</div>
                        {s.contentsDescription ? (
                          <div className="text-xs text-muted-foreground truncate max-w-[20ch]">
                            {s.contentsDescription}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{s.serviceType}</td>
                      <td className="px-4 py-3">
                        {s.weightLbs ? `${s.weightLbs} lb` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/${locale}/dashboard/shipments/${s.id}`}
                          className="text-primary hover:underline"
                        >
                          {t('view')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('page', { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
