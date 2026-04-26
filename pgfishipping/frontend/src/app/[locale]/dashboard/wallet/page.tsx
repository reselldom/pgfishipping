'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet as WalletIcon, Gift, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  getWalletBalance,
  initDeposit,
  redeemGiftCard,
  type DepositInitResult,
} from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/lib/store/toast';
import type { WalletBalance } from '@/lib/types';

export default function WalletPage(): JSX.Element {
  const t = useTranslations('wallet');
  const push = useToastStore((s) => s.push);
  const [data, setData] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Deposit state
  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState('20');
  const [method, setMethod] =
    useState<'MONCASH' | 'NATCASH' | 'PAYMON' | 'BANK_TRANSFER'>('MONCASH');
  const [submitting, setSubmitting] = useState(false);
  const [depositResult, setDepositResult] = useState<DepositInitResult | null>(
    null,
  );

  // Gift card redeem
  const [showGift, setShowGift] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  async function refresh(p = page): Promise<void> {
    try {
      const w = await getWalletBalance(p, pageSize);
      setData(w);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    void refresh(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function submitDeposit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setDepositResult(null);
    try {
      const r = await initDeposit(parseFloat(amount), method);
      setDepositResult(r);
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGift(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setRedeeming(true);
    try {
      await redeemGiftCard(giftCode);
      push({ kind: 'success', text: t('redeemSuccess') });
      setGiftCode('');
      setShowGift(false);
      await refresh(1);
      setPage(1);
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletIcon className="h-4 w-4" /> {t('balance')}
              </div>
              <div className="mt-1 text-4xl font-bold text-primary">
                ${data ? data.balanceUsd.toFixed(2) : '—'}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  USD
                </span>
              </div>
              {data ? (
                <div className="text-sm text-muted-foreground">
                  ≈ {data.balanceHtg.toLocaleString()} HTG · {t('rate')}: 1 USD ={' '}
                  {data.exchangeRate.toFixed(2)} HTG
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowDeposit((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" /> {t('deposit')}
              </Button>
              <Button variant="outline" onClick={() => setShowGift((v) => !v)}>
                <Gift className="mr-2 h-4 w-4" /> {t('redeemGift')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDeposit ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('depositTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('depositSubtitle')}
            </p>
            <form
              onSubmit={submitDeposit}
              className="grid gap-4 sm:grid-cols-3 sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor="amount">{t('depositAmount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="method">{t('depositMethod')}</Label>
                <Select
                  id="method"
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as typeof method)
                  }
                >
                  <option value="MONCASH">MonCash</option>
                  <option value="NATCASH">NatCash</option>
                  <option value="PAYMON">PayMon</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? '…' : t('depositSubmit')}
              </Button>
            </form>

            {depositResult ? (
              <div className="mt-4 rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="font-medium">
                  Reference:{' '}
                  <span className="font-mono">{depositResult.reference}</span>
                </p>
                <p className="text-muted-foreground">
                  ${depositResult.amountUsd.toFixed(2)} USD ·{' '}
                  {depositResult.paymentMethod}
                </p>
                {depositResult.paymentInstructions ? (
                  <p className="mt-2 whitespace-pre-line">
                    {depositResult.paymentInstructions}
                  </p>
                ) : (
                  <p className="mt-2">{t('depositInstructions')}</p>
                )}
                {depositResult.redirectUrl ? (
                  <a
                    href={depositResult.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    Continue to {depositResult.paymentMethod}
                  </a>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showGift ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('redeemTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={submitGift}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label htmlFor="giftCode">{t('redeemCode')}</Label>
                <Input
                  id="giftCode"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={redeeming || !giftCode.trim()}>
                {redeeming ? '…' : t('redeemSubmit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('transactions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : data.transactions.items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">{t('noTx')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t('type')}</th>
                    <th className="px-4 py-3">{t('amount')}</th>
                    <th className="px-4 py-3">{t('method')}</th>
                    <th className="px-4 py-3">{t('status')}</th>
                    <th className="px-4 py-3">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.transactions.items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 font-medium">{tx.type}</td>
                      <td
                        className={`px-4 py-3 font-mono ${
                          tx.amount < 0
                            ? 'text-red-700'
                            : tx.amount > 0
                              ? 'text-green-700'
                              : ''
                        }`}
                      >
                        {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}{' '}
                        {tx.currency}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {tx.paymentMethod ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            tx.status === 'COMPLETED'
                              ? 'success'
                              : tx.status === 'PENDING'
                                ? 'warning'
                                : tx.status === 'FAILED' ||
                                    tx.status === 'CANCELLED'
                                  ? 'danger'
                                  : 'muted'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.transactions.total > pageSize ? (
        <div className="flex justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= data.transactions.total}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </Button>
        </div>
      ) : null}
    </div>
  );
}
