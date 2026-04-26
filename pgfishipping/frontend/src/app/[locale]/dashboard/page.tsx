'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Package, Plus, Wallet, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth';
import {
  getMyAddress,
  getWalletBalance,
  listShipments,
} from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import { StatusBadge } from '@/components/shipments/status-badge';
import type { Shipment, UsAddress, WalletBalance } from '@/lib/types';

export default function DashboardOverviewPage(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const user = useAuthStore((s) => s.user);

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [address, setAddress] = useState<UsAddress | null>(null);
  const [counts, setCounts] = useState({
    preAlerts: 0,
    active: 0,
    delivered: 0,
  });
  const [recent, setRecent] = useState<Shipment[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [w, addr, pre, active, delivered] = await Promise.all([
          getWalletBalance(1, 5),
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
        setRecent(active.items.slice(0, 5));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('welcome', { name: user?.firstName ?? '' })}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('yourCode')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-primary">
              {user?.customerCode}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {t('balance')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${wallet ? wallet.balanceUsd.toFixed(2) : '—'}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                USD
              </span>
            </p>
            {wallet ? (
              <p className="text-xs text-muted-foreground">
                ≈ {wallet.balanceHtg.toLocaleString()} HTG
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {t('shipments')}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={t('preAlerts')} value={counts.preAlerts} />
              <Stat label={t('active')} value={counts.active} />
              <Stat label={t('delivered')} value={counts.delivered} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/${locale}/dashboard/pre-alert`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('newPreAlert')}
          </Button>
        </Link>
        <Link href={`/${locale}/dashboard/wallet`}>
          <Button variant="outline">
            <Wallet className="mr-2 h-4 w-4" />
            {t('depositFunds')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('recent')}</CardTitle>
            <Link
              href={`/${locale}/dashboard/shipments`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {t('viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('noShipments')}
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((s) => (
                  <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/${locale}/dashboard/shipments/${s.id}`}
                      className="flex items-center justify-between gap-4 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium truncate">
                          {s.trackingCode}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.contentsDescription || s.vendor || '—'}
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('addressTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {address ? (
              <pre className="whitespace-pre-wrap rounded-md border bg-secondary/30 p-3 font-mono text-xs leading-relaxed">
                {address.airAddress}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            <p className="text-xs text-muted-foreground">{t('addressTip')}</p>
            <Link href={`/${locale}/dashboard/address`}>
              <Button variant="outline" size="sm" className="w-full">
                {t('addressTitle')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
