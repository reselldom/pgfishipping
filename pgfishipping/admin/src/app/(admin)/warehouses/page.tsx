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
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
  type Warehouse,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const EMPTY: Partial<Warehouse> = {
  name: '',
  type: 'US',
  address: '',
  city: '',
  state: '',
  country: 'US',
  phone: '',
  email: '',
  isActive: true,
  sortOrder: 0,
};

export default function WarehousesPage(): JSX.Element {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [editing, setEditing] = useState<Partial<Warehouse> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      setItems(await listWarehouses());
    } catch (err) {
      setMsg(getApiErrorMessage(err));
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
      const payload: Partial<Warehouse> = {
        ...editing,
        state: editing.state || null,
        phone: editing.phone || null,
        email: editing.email || null,
      };
      if (editing.id) {
        await updateWarehouse(editing.id, payload);
        setMsg('Warehouse updated.');
      } else {
        await createWarehouse(payload);
        setMsg('Warehouse created.');
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
    if (!confirm('Delete this warehouse?')) return;
    try {
      await deleteWarehouse(id);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Warehouses & branches</h1>
          <p className="text-sm text-muted-foreground">
            US receiving warehouses and Haiti pickup branches.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New
        </Button>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing.id ? 'Edit warehouse' : 'New warehouse'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <F label="Name">
                <Input
                  required
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </F>
              <F label="Type">
                <Select
                  value={editing.type ?? 'US'}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value })
                  }
                >
                  <option value="US">US</option>
                  <option value="HT">HT (branch)</option>
                </Select>
              </F>
              <F label="Address" wide>
                <Input
                  required
                  value={editing.address ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </F>
              <F label="City">
                <Input
                  required
                  value={editing.city ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, city: e.target.value })
                  }
                />
              </F>
              <F label="State / Department">
                <Input
                  value={editing.state ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, state: e.target.value })
                  }
                />
              </F>
              <F label="Country (ISO)">
                <Input
                  required
                  maxLength={2}
                  value={editing.country ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      country: e.target.value.toUpperCase(),
                    })
                  }
                />
              </F>
              <F label="Phone">
                <Input
                  value={editing.phone ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </F>
              <F label="Email">
                <Input
                  type="email"
                  value={editing.email ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </F>
              <F label="Sort order">
                <Input
                  type="number"
                  value={editing.sortOrder ?? 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: parseInt(e.target.value || '0', 10),
                    })
                  }
                />
              </F>
              <F label="Active">
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
              </F>
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
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((w) => (
                <tr key={w.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3">{w.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {w.address}, {w.city}{w.state ? `, ${w.state}` : ''}
                  </td>
                  <td className="px-4 py-3">{w.country}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.isActive ? 'success' : 'muted'}>
                      {w.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(w)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove(w.id)}
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
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No warehouses configured.
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

function F({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}): JSX.Element {
  return (
    <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
