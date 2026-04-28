'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listConfig, setConfig } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const PUBLIC_SOCIAL_LINKS_KEY = 'public_social_links';

interface FormState {
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  tiktok: string;
}

const emptyForm: FormState = {
  facebook: '',
  instagram: '',
  twitter: '',
  youtube: '',
  tiktok: '',
};

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export default function SocialSettingsPage(): JSX.Element {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const configs = await listConfig();
        const row = configs.find((c) => c.key === PUBLIC_SOCIAL_LINKS_KEY);
        if (row?.value) {
          const parsed = JSON.parse(row.value) as Partial<FormState>;
          setForm({
            facebook: parsed.facebook ?? '',
            instagram: parsed.instagram ?? '',
            twitter: parsed.twitter ?? '',
            youtube: parsed.youtube ?? '',
            tiktok: parsed.tiktok ?? '',
          });
        }
      } catch {
        /* ignore — show empty form */
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const payload = {
      facebook: normalizeUrl(form.facebook),
      instagram: normalizeUrl(form.instagram),
      twitter: normalizeUrl(form.twitter),
      youtube: normalizeUrl(form.youtube),
      tiktok: normalizeUrl(form.tiktok),
    };
    const json = JSON.stringify(payload);
    try {
      await setConfig(PUBLIC_SOCIAL_LINKS_KEY, json);
      setMsg(
        'Saved. Social icons appear in the storefront footer for each URL you entered. Refresh the customer site if you already had it open.',
      );
      setForm({
        facebook: payload.facebook,
        instagram: payload.instagram,
        twitter: payload.twitter,
        youtube: payload.youtube,
        tiktok: payload.tiktok,
      });
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

  const fields = [
    { key: 'facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/...' },
    { key: 'instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/...' },
    { key: 'twitter' as const, label: 'X (Twitter)', placeholder: 'https://x.com/...' },
    { key: 'youtube' as const, label: 'YouTube', placeholder: 'https://youtube.com/...' },
    { key: 'tiktok' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website — social links</h1>
        <p className="text-sm text-muted-foreground">
          Full URLs shown as icons in the public site footer (customer portal). Leave a field empty to hide that icon.
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
