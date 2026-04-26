'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { listTickets, type SupportTicket } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function TicketsPage(): JSX.Element {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [msg, setMsg] = useState<string>('');

  async function refresh(p = page): Promise<void> {
    try {
      const r = await listTickets({
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Support tickets</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} matching
          </p>
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{t.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.user
                      ? `${t.user.firstName} ${t.user.lastName} · ${t.user.customerCode}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No tickets.
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
