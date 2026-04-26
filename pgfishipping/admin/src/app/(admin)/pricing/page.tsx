'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  createPricing,
  deletePricing,
  listPricing,
  updatePricing,
  type PricingRule,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const EMPTY: Partial<PricingRule> = {
  name: '',
  serviceType: 'AIR',
  feeType: 'PER_LB',
  ratePerLb: null,
  flatFee: null,
  minCharge: null,
  currency: 'USD',
  isActive: true,
};

export default function PricingPage(): JSX.Element {
  const [items, setItems] = useState<PricingRule[]>([]);
  const [editing, setEditing] = useState<Partial<PricingRule> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      setItems(await listPricing());
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg('');
    try {
      const payload: Partial<PricingRule> = {
        ...editing,
        ratePerLb: editing.ratePerLb === null || editing.ratePerLb === undefined
          ? null
          : Number(editing.ratePerLb),
        flatFee: editing.flatFee === null || editing.flatFee === undefined
          ? null
          : Number(editing.flatFee),
        minCharge: editing.minCharge === null || editing.minCharge === undefined
          ? null
          : Number(editing.minCharge),
      };
      if (editing.id) {
        await updatePricing(editing.id, payload);
        setMsg('Pricing rule updated.');
      } else {
        await createPricing(payload);
        setMsg('Pricing rule created.');
      }
      setEditing(null);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    if (!confirm('Delete this pricing rule?')) return;
    try {
      await deletePricing(id);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pricing rules</h1>
          <p className="text-sm text-muted-foreground">
            Used by the calculator and shipment cost computation.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New rule
        </Button>
      </div>

      {(msg || error) ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">
          {msg || error}
        </div>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing.id ? 'Edit rule' : 'New rule'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  required
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Service type">
                <Select
                  value={editing.serviceType ?? 'AIR'}
                  onChange={(e) =>
                    setEditing({ ...editing, serviceType: e.target.value })
                  }
                >
                  <option value="AIR">AIR</option>
                  <option value="SEA">SEA</option>
                </Select>
              </Field>
              <Field label="Fee type">
                <Select
                  value={editing.feeType ?? 'PER_LB'}
                  onChange={(e) =>
                    setEditing({ ...editing, feeType: e.target.value })
                  }
                >
                  <option value="PER_LB">PER_LB</option>
                  <option value="FLAT">FLAT</option>
                  <option value="MIN">MIN</option>
                </Select>
              </Field>
              <Field label="Currency">
                <Input
                  value={editing.currency ?? 'USD'}
                  maxLength={3}
                  onChange={(e) =>
                    setEditing({ ...editing, currency: e.target.value })
                  }
                />
              </Field>
              <Field label="Rate per lb">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.ratePerLb ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      ratePerLb: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Flat fee">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.flatFee ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      flatFee: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Minimum charge">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.minCharge ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      minCharge: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Active">
                <Select
                  value={editing.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      isActive: e.target.value === 'true',
                    })
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Fee type</th>
                <th className="px-4 py-3">Rate/lb</th>
                <th className="px-4 py-3">Flat</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.serviceType}</td>
                  <td className="px-4 py-3">{p.feeType}</td>
                  <td className="px-4 py-3">{p.ratePerLb ?? '—'}</td>
                  <td className="px-4 py-3">{p.flatFee ?? '—'}</td>
                  <td className="px-4 py-3">{p.minCharge ?? '—'}</td>
                  <td className="px-4 py-3">{p.currency}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? 'success' : 'muted'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                    colSpan={9}
                  >
                    No pricing rules configured.
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
