'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteConfig,
  listConfig,
  setConfig,
  type SystemConfig,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function ConfigPage(): JSX.Element {
  const [items, setItems] = useState<SystemConfig[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      setItems(await listConfig());
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await setConfig(key, value);
      setKey('');
      setValue('');
      setMsg('Saved.');
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(k: string): Promise<void> {
    if (!confirm(`Delete config key "${k}"?`)) return;
    try {
      await deleteConfig(k);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System configuration</h1>
        <p className="text-sm text-muted-foreground">
          Runtime tunables (exchange rates, feature flags, copy overrides).
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Set / update key</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={save}
            className="grid gap-3 sm:grid-cols-[2fr_3fr_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="exchange_rate_htg"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy}>
              <Plus className="mr-2 h-4 w-4" />
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((c) => (
                <tr key={c.key}>
                  <td className="px-4 py-3 font-mono">{c.key}</td>
                  <td className="px-4 py-3 break-all">{c.value}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(c.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setKey(c.key);
                        setValue(c.value);
                      }}
                    >
                      Edit
                    </Button>{' '}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(c.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No config keys.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
