'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  adjustWallet,
  getCustomer,
  setCustomerStatus,
  type CustomerDetail,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function CustomerDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      const c = await getCustomer(id);
      setData(c);
      setNewStatus(c.user.status);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveStatus(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingStatus(true);
    setMsg('');
    try {
      await setCustomerStatus(id, newStatus);
      setMsg(`Status updated to ${newStatus}.`);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setSavingStatus(false);
    }
  }

  async function submitAdjust(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAdjusting(true);
    setMsg('');
    try {
      const v = parseFloat(adjAmount);
      if (!Number.isFinite(v) || v === 0) {
        setMsg('Amount must be non-zero.');
        return;
      }
      if (!adjReason.trim() || adjReason.trim().length < 3) {
        setMsg('Reason must be at least 3 characters.');
        return;
      }
      await adjustWallet(id, v, adjReason);
      setAdjAmount('');
      setAdjReason('');
      setMsg('Wallet adjusted.');
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || 'Not found'}
        </div>
      </div>
    );
  }

  const c = data.user;
  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {c.firstName} {c.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{c.customerCode}</span> · {c.email}
          </p>
        </div>
        <Badge variant={statusVariant(c.status)}>
          {c.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Customer code" value={c.customerCode} mono />
              <Row label="Email" value={c.email} />
              <Row label="Phone" value={c.phoneCell ?? null} />
              <Row label="Language" value={c.language} />
              <Row label="Client type" value={c.clientType ?? null} />
              <Row
                label="Email verified"
                value={c.emailVerified ? 'Yes' : 'No'}
              />
              <Row label="Joined" value={formatDate(c.createdAt)} />
              <Row label="Loyalty points" value={String(c.loyaltyPoints ?? 0)} />
              <Row label="Referral code" value={c.referralCode ?? null} mono />
              <Row
                label="Total shipments"
                value={String(data.stats.shipmentCount)}
              />
              <Row
                label="Total paid"
                value={formatCurrency(data.stats.totalPaidUsd)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Balance
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(c.wallet?.balanceUsd ?? 0)}
              </div>
              {c.wallet?.balanceHtg ? (
                <div className="text-xs text-muted-foreground">
                  HTG {c.wallet.balanceHtg.toFixed(2)}
                </div>
              ) : null}
            </div>

            <form onSubmit={submitAdjust} className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="adjAmount">Adjust by (USD)</Label>
                <Input
                  id="adjAmount"
                  type="number"
                  step="0.01"
                  placeholder="-10 or 25"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adjReason">Reason (min 3 chars)</Label>
                <Textarea
                  id="adjReason"
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={adjusting || !adjAmount}
              >
                {adjusting ? 'Adjusting…' : 'Adjust wallet'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account status</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={saveStatus}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-56"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="BANNED">BANNED</option>
              </Select>
            </div>
            <Button type="submit" disabled={savingStatus}>
              {savingStatus ? 'Saving…' : 'Update status'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent shipments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentShipments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No shipments yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono">
                      <Link
                        href={`/shipments/${s.id}`}
                        className="text-primary hover:underline"
                      >
                        {s.trackingCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.serviceType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.totalCost ? formatCurrency(s.totalCost) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentTransactions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No transactions.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">{t.type}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.paymentMethod ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {t.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm'}>
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
