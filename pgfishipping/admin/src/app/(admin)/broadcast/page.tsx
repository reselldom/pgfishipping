'use client';

import { useState } from 'react';
import { Send, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  previewBroadcast,
  sendBroadcast,
  type BroadcastPreviewResult,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

export default function BroadcastPage(): JSX.Element {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [segment, setSegment] = useState<'all' | 'active' | 'verified' | 'with-balance'>('active');
  const [preview, setPreview] = useState<BroadcastPreviewResult | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function doPreview(): Promise<void> {
    setPreviewBusy(true);
    setMsg('');
    try {
      const r = await previewBroadcast({
        subject,
        bodyHtml,
        bodyText: bodyText || undefined,
        segment,
      });
      setPreview(r);
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setPreviewBusy(false);
    }
  }

  async function doSend(): Promise<void> {
    if (!confirm(`Send to ~${preview?.count ?? '?'} recipients?`)) return;
    setSendBusy(true);
    setMsg('');
    try {
      const r = await sendBroadcast({
        subject,
        bodyHtml,
        bodyText: bodyText || undefined,
        segment,
      });
      setMsg(
        `Broadcast finished: ${r.sent} sent, ${r.failed} failed (of ${r.recipients}).`,
      );
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Broadcast email</h1>
        <p className="text-sm text-muted-foreground">
          Send promotional or operational emails to customer segments.
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="segment">Segment</Label>
              <Select
                id="segment"
                value={segment}
                onChange={(e) =>
                  setSegment(e.target.value as typeof segment)
                }
              >
                <option value="all">All customers</option>
                <option value="active">Active only</option>
                <option value="verified">Verified emails only</option>
                <option value="with-balance">Customers with balance &gt; 0</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bodyHtml">HTML body</Label>
              <Textarea
                id="bodyHtml"
                rows={8}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<p>Hello {{firstName}},</p>"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bodyText">Plain text fallback (optional)</Label>
              <Textarea
                id="bodyText"
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={doPreview}
                disabled={previewBusy || !subject || !bodyHtml}
              >
                <Eye className="mr-2 h-4 w-4" />
                {previewBusy ? 'Previewing…' : 'Preview audience'}
              </Button>
              <Button
                type="button"
                onClick={doSend}
                disabled={sendBusy || !preview || !subject || !bodyHtml}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendBusy ? 'Sending…' : 'Send broadcast'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview — {preview.count.toLocaleString()} recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Sample recipients ({preview.sample.length} of {preview.count}):
            </p>
            <ul className="text-sm">
              {preview.sample.map((s) => (
                <li
                  key={s.email}
                  className="flex justify-between border-b py-1.5 last:border-b-0"
                >
                  <span>{s.firstName}</span>
                  <span className="text-muted-foreground">{s.email}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
