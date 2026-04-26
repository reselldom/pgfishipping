'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { listCustomers, type AdminCustomer } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function CustomersPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  async function refresh(p = page): Promise<void> {
    setLoading(true);
    try {
      const r = await listCustomers({
        search: search || undefined,
        status: status || undefined,
        page: p,
        pageSize,
      });
      setItems(r.items);
      setTotal(r.total);
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
  }, [status]);

  function submitSearch(e: React.FormEvent): void {
    e.preventDefault();
    void refresh(1);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Email, name, code…"
              className="pl-8 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-44"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </Select>
          <Button variant="outline" type="submit">
            Search
          </Button>
        </form>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No customers match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-mono">{c.customerCode}</td>
                      <td className="px-4 py-3">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(c.status)}>
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-primary hover:underline"
                        >
                          View
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
