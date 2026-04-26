'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  createStaff,
  deactivateStaff,
  listStaff,
  updateStaff,
  type StaffMember,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

interface FormState {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
  warehouseId: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'STAFF',
  warehouseId: '',
  isActive: true,
};

export default function StaffPage(): JSX.Element {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function refresh(): Promise<void> {
    try {
      setItems(await listStaff());
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
      if (editing.id) {
        const payload: Parameters<typeof updateStaff>[1] = {
          name: editing.name,
          email: editing.email,
          role: editing.role,
          warehouseId: editing.warehouseId || null,
          isActive: editing.isActive,
        };
        if (editing.password) payload.password = editing.password;
        await updateStaff(editing.id, payload);
        setMsg('Staff member updated.');
      } else {
        await createStaff({
          name: editing.name,
          email: editing.email,
          password: editing.password,
          role: editing.role,
          warehouseId: editing.warehouseId || null,
        });
        setMsg('Staff member created.');
      }
      setEditing(null);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string): Promise<void> {
    if (!confirm('Deactivate this staff member?')) return;
    try {
      await deactivateStaff(id);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage internal staff and admins.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New staff
        </Button>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing.id ? 'Edit staff' : 'New staff'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <F label="Full name">
                <Input
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </F>
              <F label="Email">
                <Input
                  required
                  type="email"
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </F>
              <F label={editing.id ? 'New password (optional)' : 'Password'}>
                <Input
                  type="password"
                  required={!editing.id}
                  minLength={8}
                  value={editing.password}
                  onChange={(e) =>
                    setEditing({ ...editing, password: e.target.value })
                  }
                />
              </F>
              <F label="Role">
                <Select
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      role: e.target.value as FormState['role'],
                    })
                  }
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="STAFF">STAFF</option>
                </Select>
              </F>
              <F label="Warehouse ID (optional)">
                <Input
                  value={editing.warehouseId}
                  onChange={(e) =>
                    setEditing({ ...editing, warehouseId: e.target.value })
                  }
                />
              </F>
              {editing.id ? (
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
              ) : null}
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
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">{s.role}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.warehouseId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? 'success' : 'muted'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditing({
                            id: s.id,
                            name: s.name,
                            email: s.email,
                            password: '',
                            role: s.role,
                            warehouseId: s.warehouseId ?? '',
                            isActive: s.isActive,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivate(s.id)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
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
                    No staff yet.
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
