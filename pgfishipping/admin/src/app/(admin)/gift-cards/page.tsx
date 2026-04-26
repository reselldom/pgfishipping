'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  issueGiftCard,
  listGiftCards,
  voidGiftCard,
  type GiftCard,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function GiftCardsPage(): JSX.Element {
  const [items, setItems] = useState<GiftCard[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [msg, setMsg] = useState<string>('');

  const [creating, setCreating] = useState(false);
  const [valueUsd, setValueUsd] = useState('25');
  const [issuedTo, setIssuedTo] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh(p = page): Promise<void> {
    try {
      const r = await listGiftCards({
        status: status || undefined,
        page: p,
        pageSize,
      });
      setItems(r.items);
      setTotal(r.total);
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    void refresh(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function issue(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const v = parseFloat(valueUsd);
      if (!Number.isFinite(v) || v <= 0) {
        setMsg('Value must be > 0.');
        return;
      }
      const r = await issueGiftCard({
        valueUsd: v,
        issuedTo: issuedTo || null,
        expiresAt: expiresAt || null,
      });
      setMsg(`Issued ${r.code}.`);
      setCreating(false);
      setIssuedTo('');
      setExpiresAt('');
      await refresh(1);
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doVoid(id: string): Promise<void> {
    if (!confirm('Void this gift card?')) return;
    try {
      await voidGiftCard(id);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gift cards</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </Select>
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> Issue
          </Button>
        </div>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>Issue gift card</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={issue} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="valueUsd">Value (USD)</Label>
                <Input
                  id="valueUsd"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valueUsd}
                  onChange={(e) => setValueUsd(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issuedTo">Issued to (optional)</Label>
                <Input
                  id="issuedTo"
                  value={issuedTo}
                  onChange={(e) => setIssuedTo(e.target.value)}
                  placeholder="email or name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expires at (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Issuing…' : 'Issue gift card'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued to</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 font-mono">{g.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(g.valueUsd)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {g.issuedTo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(g.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(g.expiresAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.status === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => doVoid(g.id)}
                      >
                        Void
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No gift cards.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                void refresh(page - 1);
              }}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                void refresh(page + 1);
              }}
            >
              ›
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
