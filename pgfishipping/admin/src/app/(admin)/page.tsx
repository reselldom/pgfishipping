'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Package,
  DollarSign,
  Wallet,
  Truck,
  CheckCircle2,
  Clock,
  Gift,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getDashboardStats,
  getRevenue30,
  type DashboardStats,
  type RevenuePoint,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    Promise.all([getDashboardStats(), getRevenue30()])
      .then(([s, r]) => {
        setStats(s);
        setRevenue(r);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const max = Math.max(1, ...revenue.map((r) => r.revenueUsd));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Operational snapshot of the platform.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<Users className="h-4 w-4" />}
              label="Customers"
              value={stats.customers.total.toString()}
              hint={`${stats.customers.active} active · +${stats.customers.newLast30d} last 30d`}
            />
            <Stat
              icon={<Package className="h-4 w-4" />}
              label="Shipments"
              value={stats.shipments.total.toString()}
              hint={`${stats.shipments.last30d} last 30d`}
            />
            <Stat
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue (30d)"
              value={formatCurrency(stats.revenue.last30dUsd)}
              hint={`Pending deposits ${formatCurrency(stats.revenue.pendingDepositsUsd)}`}
            />
            <Stat
              icon={<Wallet className="h-4 w-4" />}
              label="Wallet float"
              value={formatCurrency(stats.revenue.totalWalletBalanceUsd)}
              hint={`${stats.giftCards.active} active gift cards · ${formatCurrency(stats.giftCards.activeValueUsd)}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Mini
              icon={<Clock className="h-4 w-4" />}
              label="Waiting"
              value={stats.shipments.waiting.toString()}
            />
            <Mini
              icon={<Truck className="h-4 w-4" />}
              label="In transit"
              value={stats.shipments.inTransit.toString()}
            />
            <Mini
              icon={<Package className="h-4 w-4" />}
              label="Available"
              value={stats.shipments.available.toString()}
            />
            <Mini
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Delivered"
              value={stats.shipments.delivered.toString()}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daily revenue — last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed payments in the last 30 days.
                </p>
              ) : (
                <>
                  <div className="flex h-40 items-end gap-1">
                    {revenue.map((d) => {
                      const h = Math.max(2, (d.revenueUsd / max) * 100);
                      return (
                        <div
                          key={d.date}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`${d.date}: $${d.revenueUsd.toFixed(2)}`}
                        >
                          <div
                            className="w-full rounded-t bg-primary/80 hover:bg-primary"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>{revenue[0]?.date ?? ''}</span>
                    <span>{revenue[revenue.length - 1]?.date ?? ''}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Gift className="h-4 w-4" />
              <CardTitle className="text-base">Gift cards in circulation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.giftCards.active}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.giftCards.activeValueUsd)} outstanding
                value.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}): JSX.Element {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Mini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
