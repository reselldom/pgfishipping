'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  closeTicket,
  getTicket,
  replyTicket,
  type SupportTicket,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function TicketDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [data, setData] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      const t = await getTicket(id);
      setData(t);
      setReply(t.reply ?? '');
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

  async function submitReply(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      await replyTicket(id, reply);
      setMsg('Reply saved.');
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function close(): Promise<void> {
    if (!confirm('Close this ticket?')) return;
    setClosing(true);
    setMsg('');
    try {
      await closeTicket(id);
      setMsg('Ticket closed.');
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link
          href="/tickets"
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

  const isClosed = data.status === 'closed';

  return (
    <div className="space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{data.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {data.user
              ? `${data.user.firstName} ${data.user.lastName} · ${data.user.email}`
              : '—'}{' '}
            · {formatDateTime(data.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
          {!isClosed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={close}
              disabled={closing}
            >
              {closing ? 'Closing…' : 'Close ticket'}
            </Button>
          ) : null}
        </div>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Customer message
            </div>
            <p className="whitespace-pre-wrap text-sm">{data.message}</p>
          </div>

          {data.reply ? (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Staff reply
              </div>
              <p className="whitespace-pre-wrap text-sm">{data.reply}</p>
            </div>
          ) : null}

          {!isClosed ? (
            <form onSubmit={submitReply} className="space-y-2 pt-2">
              <Textarea
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={data.reply ? 'Update reply…' : 'Type a reply…'}
              />
              <Button type="submit" disabled={busy || !reply.trim()}>
                {busy ? 'Saving…' : data.reply ? 'Update reply' : 'Send reply'}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
