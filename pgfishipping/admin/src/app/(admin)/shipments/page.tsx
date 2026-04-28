'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  bulkUpdateStatus,
  listAdminShipments,
  type AdminShipment,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUSES = [
  'WAITING',
  'RECEIVED',
  'IN_TRANSIT',
  'IN_TRANSIT_B',
  'INVENTORY',
  'AVAILABLE',
  'DELIVERED',
  'RETURNED',
  'LOST',
  'CANCELLED',
];

export default function AdminShipmentsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<AdminShipment[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('IN_TRANSIT');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string>('');

  async function refresh(p = page): Promise<void> {
    setLoading(true);
    try {
      const r = await listAdminShipments({
        search: search || undefined,
        status: status || undefined,
        serviceType: serviceType || undefined,
        customerCode: customerCode || undefined,
        page: p,
        pageSize,
      });
      setItems(r.items);
      setTotal(r.total);
      setSelected(new Set());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, serviceType]);

  function submitSearch(e: React.FormEvent): void {
    e.preventDefault();
    void refresh(1);
    setPage(1);
  }

  function toggleAll(): void {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function toggle(id: string): void {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function applyBulk(): Promise<void> {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setBulkMsg('');
    try {
      await bulkUpdateStatus(Array.from(selected), bulkStatus);
      setBulkMsg(`Updated ${selected.size} shipments to ${bulkStatus}.`);
      await refresh();
    } catch (err) {
      setBulkMsg(getApiErrorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="text-2xl font-bold">Shipments</h1>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} total
            </p>
          </div>
          <Link
            href="/shipments/intake"
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            + Receive package
          </Link>
        </div>
        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tracking, vendor…"
              className="pl-8 w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Input
            placeholder="Customer code"
            className="w-32"
            value={customerCode}
            onChange={(e) => setCustomerCode(e.target.value)}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-40"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-32"
          >
            <option value="">Air & Sea</option>
            <option value="AIR">Air</option>
            <option value="SEA">Sea</option>
          </Select>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-sm">
              <strong>{selected.size}</strong> selected
            </span>
            <Select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-44"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Button onClick={applyBulk} disabled={bulkBusy} size="sm">
              {bulkBusy ? 'Applying…' : 'Apply bulk status'}
            </Button>
            {bulkMsg ? (
              <span className="text-xs text-muted-foreground">{bulkMsg}</span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No shipments match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 && selected.size === items.length
                        }
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-3">Tracking</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Service</th>
                    <th className="px-3 py-3">Weight</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((s) => (
                    <tr key={s.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                        />
                      </td>
                      <td className="px-3 py-3 font-mono">{s.trackingCode}</td>
                      <td className="px-3 py-3">
                        {s.user ? (
                          <Link
                            href={`/customers/${s.user.id}`}
                            className="text-primary hover:underline"
                          >
                            {s.user.customerCode}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3">{s.serviceType}</td>
                      <td className="px-3 py-3">
                        {s.weightLbs ? `${s.weightLbs} lb` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(s.status)}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/shipments/${s.id}`}
                          className="text-primary hover:underline"
                        >
                          Open
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
