'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { listConfig, setConfig } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const PUBLIC_FOOTER_CONTENT_KEY = 'public_footer_content';

interface Spot {
  title: string;
  detail: string;
}

interface PhoneRow {
  label: string;
  number: string;
}

function normalizeLoadedPhones(parsed: Record<string, unknown>): PhoneRow[] {
  const raw = parsed.phones;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ label: '', number: '' }];
  }
  const rows = raw.map((item): PhoneRow => {
    if (typeof item === 'string') {
      return { label: '', number: item };
    }
    if (item && typeof item === 'object' && 'number' in item) {
      const o = item as { label?: string; number?: string };
      return {
        label: typeof o.label === 'string' ? o.label : '',
        number: typeof o.number === 'string' ? o.number : '',
      };
    }
    return { label: '', number: '' };
  });

  const withContent = rows.filter((r) => r.number.trim() || r.label.trim());
  return withContent.length > 0 ? withContent : [{ label: '', number: '' }];
}

export default function FooterSettingsPage(): JSX.Element {
  const [phones, setPhones] = useState<PhoneRow[]>([{ label: '', number: '' }]);
  const [businessHours, setBusinessHours] = useState('');
  const [email, setEmail] = useState('');
  const [usa, setUsa] = useState<Spot[]>([{ title: '', detail: '' }]);
  const [haiti, setHaiti] = useState<Spot[]>([{ title: '', detail: '' }]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const configs = await listConfig();
        const row = configs.find((c) => c.key === PUBLIC_FOOTER_CONTENT_KEY);
        if (!row?.value?.trim()) {
          setLoaded(true);
          return;
        }
        const parsed = JSON.parse(row.value) as Record<string, unknown>;
        setPhones(normalizeLoadedPhones(parsed));
        setBusinessHours(
          typeof parsed.businessHours === 'string' ? parsed.businessHours : '',
        );
        setEmail(
          typeof parsed.email === 'string' ? parsed.email.trim() : '',
        );
        const u = parsed.usaLocations;
        const uRows = Array.isArray(u) ? (u as Spot[]) : [];
        setUsa(uRows.length > 0 ? uRows : [{ title: '', detail: '' }]);
        const h = parsed.haitiLocations;
        const hRows = Array.isArray(h) ? (h as Spot[]) : [];
        setHaiti(hRows.length > 0 ? hRows : [{ title: '', detail: '' }]);
      } catch {
        /* keep defaults */
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, []);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const phoneLines = phones
      .map((r) => ({
        number: r.number.trim(),
        ...(r.label.trim() ? { label: r.label.trim() } : {}),
      }))
      .filter((p) => p.number.length > 0);
    const spots = (
      rows: Spot[],
    ): Array<{ title: string; detail: string }> =>
      rows
        .map((r) => ({
          title: r.title.trim(),
          detail: r.detail.trim(),
        }))
        .filter((r) => r.title.length > 0);
    const payload = {
      phones: phoneLines,
      businessHours: businessHours.trim(),
      email: email.trim(),
      usaLocations: spots(usa),
      haitiLocations: spots(haiti),
    };
    try {
      await setConfig(PUBLIC_FOOTER_CONTENT_KEY, JSON.stringify(payload));
      setMsg(
        'Saved. Public footer updates after you refresh the customer site.',
      );
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website — footer content</h1>
        <p className="text-sm text-muted-foreground">
          Phones (with optional titles such as Fax or Main line), business hours,
          email, and USA / Haiti address blocks for the public site footer.
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <form onSubmit={save} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Phones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {phones.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 sm:min-w-[9rem] sm:max-w-[40%]">
                  <Label className="text-xs font-normal text-muted-foreground">
                    Title (optional)
                  </Label>
                  <Input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...phones];
                      next[i] = { ...next[i], label: e.target.value };
                      setPhones(next);
                    }}
                    placeholder="e.g. Fax, Business line"
                    className="mt-1"
                  />
                </div>
                <div className="min-w-0 flex-[1.3]">
                  <Label className="text-xs font-normal text-muted-foreground">
                    Number
                  </Label>
                  <Input
                    value={row.number}
                    onChange={(e) => {
                      const next = [...phones];
                      next[i] = { ...next[i], number: e.target.value };
                      setPhones(next);
                    }}
                    placeholder="+1 …"
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    setPhones((p) => {
                      const filtered = p.filter((_x, idx) => idx !== i);
                      return filtered.length === 0
                        ? [{ label: '', number: '' }]
                        : filtered;
                    })
                  }
                  aria-label="Remove phone line"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPhones((p) => [...p, { label: '', number: '' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add phone
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="footer-hours">
                Opening hours shown in the footer
              </Label>
              <Textarea
                id="footer-hours"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="Monday–Saturday · 9:00 AM – 5:00 PM"
                rows={2}
                className="resize-y font-sans text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Default suggestion: Mon–Sat, 9:00 AM–5:00 PM — edit freely for
                your locale or bilingual text.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="footer-email">Support email</Label>
              <Input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="support@example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>USA addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usa.map((row, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Label className="font-semibold">Location {i + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setUsa((rows) => rows.filter((_r, idx) => idx !== i))
                    }
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  value={row.title}
                  onChange={(e) => {
                    const next = [...usa];
                    next[i] = { ...next[i], title: e.target.value };
                    setUsa(next);
                  }}
                  placeholder="City / office name"
                />
                <Textarea
                  value={row.detail}
                  onChange={(e) => {
                    const next = [...usa];
                    next[i] = { ...next[i], detail: e.target.value };
                    setUsa(next);
                  }}
                  placeholder="Street, city, ZIP"
                  rows={3}
                  className="resize-y font-sans text-sm"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUsa((r) => [...r, { title: '', detail: '' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add USA location
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Haiti addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {haiti.map((row, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Label className="font-semibold">Location {i + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setHaiti((rows) =>
                        rows.filter((_r, idx) => idx !== i),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  value={row.title}
                  onChange={(e) => {
                    const next = [...haiti];
                    next[i] = { ...next[i], title: e.target.value };
                    setHaiti(next);
                  }}
                  placeholder="Branch / city"
                />
                <Textarea
                  value={row.detail}
                  onChange={(e) => {
                    const next = [...haiti];
                    next[i] = { ...next[i], detail: e.target.value };
                    setHaiti(next);
                  }}
                  placeholder="Address — omit cities you do not serve (e.g. Cayes)."
                  rows={3}
                  className="resize-y font-sans text-sm"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setHaiti((r) => [...r, { title: '', detail: '' }])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Haiti location
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save footer'}
        </Button>
      </form>
    </div>
  );
}
