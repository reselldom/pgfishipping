'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getAdminHaitiDeliverySettings,
  updateAdminHaitiDeliverySettings,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

export default function HaitiDeliverySettingsPage(): JSX.Element {
  const [departments, setDepartments] = useState<
    Awaited<ReturnType<typeof getAdminHaitiDeliverySettings>>['departments']
  >([]);
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const d = await getAdminHaitiDeliverySettings();
        setDepartments(d.departments);
        setDisabledKeys(new Set(d.disabledKeys));
      } catch {
        setMsg('Could not load Haiti delivery settings.');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const out: Array<{ compound: string; dept: string; city: string }> = [];
    for (const d of departments) {
      for (const c of d.cities) {
        out.push({
          compound: `${d.key}:${c}`,
          dept: `${d.nameFr} (${d.key})`,
          city: c,
        });
      }
    }
    return out.sort((a, b) =>
      `${a.dept} ${a.city}`.localeCompare(`${b.dept} ${b.city}`),
    );
  }, [departments]);

  function toggle(compound: string, enable: boolean): void {
    setDisabledKeys((prev) => {
      const next = new Set(prev);
      if (enable) next.delete(compound);
      else next.add(compound);
      return next;
    });
  }

  async function onSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const d = await updateAdminHaitiDeliverySettings([...disabledKeys]);
      setDepartments(d.departments);
      setDisabledKeys(new Set(d.disabledKeys));
      setMsg('Saved. Checked cities remain available to customers on New pre-alert.');
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Haiti delivery — cities</h1>
        <p className="text-sm text-muted-foreground">
          Uncheck a city to hide it from the customer pre-alert form. Staff can still choose any
          city when using <strong>Receive package</strong>.
        </p>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      <form onSubmit={(e) => void onSave(e)}>
        <Card>
          <CardHeader>
            <CardTitle>Cities enabled for customers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Departments and capitals follow official Haiti divisions. Larger communes appear under
              Ouest alongside Port-au-Prince.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto rounded-md border p-3 text-sm">
              {rows.map(({ compound, dept, city }) => {
                const checked = !disabledKeys.has(compound);
                return (
                  <li key={compound}>
                    <label className="flex cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggle(compound, e.target.checked)}
                      />
                      <span>
                        <span className="text-muted-foreground">{dept}</span>{' '}
                        <span className="font-medium">· {city}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
