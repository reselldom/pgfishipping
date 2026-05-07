'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  addShipmentEvent,
  getAdminShipment,
  updateAdminShipment,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatHaitiDeliveryLabel } from '@/lib/haiti-delivery-meta';

const STATUSES = [
  'WAITING',
  'RECEIVED',
  'IN_TRANSIT',
  'IN_TRANSIT_B',
  'INVENTORY',
  'AVAILABLE',
  'DELIVERED',
  'RETURNED',
  'LOST',
  'CANCELLED',
];

export default function AdminShipmentDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getAdminShipment>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  // Edit form
  const [weightLbs, setWeightLbs] = useState('');
  const [vendor, setVendor] = useState('');
  const [contents, setContents] = useState('');
  const [externalTracking, setExternalTracking] = useState('');
  const [externalCarrier, setExternalCarrier] = useState('');
  const [fobValue, setFobValue] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Tracking event
  const [evStatus, setEvStatus] = useState('IN_TRANSIT');
  const [evLabel, setEvLabel] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [deliveredSignerRole, setDeliveredSignerRole] = useState<
    'ACCOUNT_HOLDER' | 'AUTHORIZED_THIRD_PARTY' | 'CUSTOM'
  >('ACCOUNT_HOLDER');
  const [deliveredSignerCustomName, setDeliveredSignerCustomName] = useState('');
  const [addingEv, setAddingEv] = useState(false);

  async function refresh(): Promise<void> {
    try {
      const s = await getAdminShipment(id);
      setData(s);
      setWeightLbs(s.weightLbs?.toString() ?? '');
      setVendor(s.vendor ?? '');
      setContents(s.contentsDescription ?? '');
      setExternalTracking(s.externalTracking ?? '');
      setExternalCarrier(s.externalCarrier ?? '');
      setFobValue(s.fobValue?.toString() ?? '');
      setTotalCost(s.totalCost?.toString() ?? '');
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

  async function saveEdit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingEdit(true);
    setMsg('');
    try {
      const payload: Record<string, unknown> = {};
      if (weightLbs) payload.weightLbs = parseFloat(weightLbs);
      payload.vendor = vendor || undefined;
      payload.contentsDescription = contents || undefined;
      payload.externalTracking = externalTracking || null;
      payload.externalCarrier = externalCarrier || null;
      if (fobValue) payload.fobValue = parseFloat(fobValue);
      if (totalCost) payload.totalCost = parseFloat(totalCost);
      await updateAdminShipment(id, payload);
      setMsg('Shipment updated.');
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  async function addEvent(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAddingEv(true);
    setMsg('');
    try {
      if (evStatus === 'DELIVERED') {
        if (deliveredSignerRole === 'CUSTOM' && !deliveredSignerCustomName.trim()) {
          setMsg('Enter the recipient name when "Other recipient" is selected.');
          setAddingEv(false);
          return;
        }
        if (
          deliveredSignerRole === 'AUTHORIZED_THIRD_PARTY' &&
          !data?.thirdPartyAuth
        ) {
          setMsg(
            'The customer must register third-party pickup on their dashboard before you can choose that option.',
          );
          setAddingEv(false);
          return;
        }
      }
      await addShipmentEvent(
        id,
        evStatus,
        evLabel || undefined,
        evLocation || undefined,
        evStatus === 'DELIVERED' ? deliveredSignerRole : undefined,
        deliveredSignerRole === 'CUSTOM'
          ? deliveredSignerCustomName
          : undefined,
      );
      setEvLabel('');
      setEvLocation('');
      setDeliveredSignerCustomName('');
      setMsg(`Tracking event added (${evStatus}).`);
      await refresh();
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setAddingEv(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link
          href="/shipments"
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

  return (
    <div className="space-y-6">
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shipments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-mono">{data.trackingCode}</h1>
          <p className="text-sm text-muted-foreground">
            {data.serviceType} ·{' '}
            {data.user ? (
              <Link
                href={`/customers/${data.user.id}`}
                className="text-primary hover:underline"
              >
                {data.user.customerCode} — {data.user.firstName}{' '}
                {data.user.lastName}
              </Link>
            ) : (
              'No customer'
            )}
          </p>
        </div>
        <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
      </div>

      {msg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{msg}</div>
      ) : null}

      {formatHaitiDeliveryLabel(data.haitiDepartmentKey, data.haitiDeliveryCity) ? (
        <Card>
          <CardHeader>
            <CardTitle>Haiti pickup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {formatHaitiDeliveryLabel(data.haitiDepartmentKey, data.haitiDeliveryCity)}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Third-party pickup authorization</CardTitle>
          <p className="text-xs text-muted-foreground">
            This shipment belongs to{' '}
            {data.user ? (
              <Link
                href={`/customers/${data.user.id}`}
                className="text-primary hover:underline"
              >
                {data.user.customerCode} — {data.user.firstName} {data.user.lastName}
              </Link>
            ) : (
              'unknown customer'
            )}
            . The customer configures who may collect the package from their dashboard.
          </p>
        </CardHeader>
        <CardContent>
          {data.thirdPartyAuth ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Authorized pickup</dt>
                <dd className="font-medium">{data.thirdPartyAuth.authorizedName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{data.thirdPartyAuth.phone}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ID type</dt>
                <dd className="font-medium">{data.thirdPartyAuth.idType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ID number</dt>
                <dd className="font-mono text-sm">{data.thirdPartyAuth.idNumber}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Registered</dt>
                <dd>{formatDateTime(data.thirdPartyAuth.createdAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No third-party pickup recorded for this shipment yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit shipment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Weight (lb)">
                <Input
                  type="number"
                  step="0.01"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                />
              </Field>
              <Field label="Vendor">
                <Input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </Field>
              <Field label="External tracking">
                <Input
                  value={externalTracking}
                  onChange={(e) => setExternalTracking(e.target.value)}
                />
              </Field>
              <Field label="Carrier">
                <Input
                  value={externalCarrier}
                  onChange={(e) => setExternalCarrier(e.target.value)}
                />
              </Field>
              <Field label="Declared value (FOB)">
                <Input
                  type="number"
                  step="0.01"
                  value={fobValue}
                  onChange={(e) => setFobValue(e.target.value)}
                />
              </Field>
              <Field label="Total cost (USD)">
                <Input
                  type="number"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Contents description">
                  <Textarea
                    rows={3}
                    value={contents}
                    onChange={(e) => setContents(e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add tracking event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addEvent} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="evStatus">Status</Label>
                <Select
                  id="evStatus"
                  value={evStatus}
                  onChange={(e) => setEvStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evLabel">Label</Label>
                <Input
                  id="evLabel"
                  value={evLabel}
                  onChange={(e) => setEvLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evLocation">Location</Label>
                <Input
                  id="evLocation"
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                />
              </div>
              {evStatus === 'DELIVERED' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveredSignerRole">Delivered — received by</Label>
                    <Select
                      id="deliveredSignerRole"
                      value={deliveredSignerRole}
                      onChange={(e) =>
                        setDeliveredSignerRole(
                          e.target.value as
                            | 'ACCOUNT_HOLDER'
                            | 'AUTHORIZED_THIRD_PARTY'
                            | 'CUSTOM',
                        )
                      }
                    >
                      <option value="ACCOUNT_HOLDER">
                        Customer (account holder)
                        {data.user
                          ? ` — ${data.user.firstName} ${data.user.lastName}`
                          : ''}
                      </option>
                      <option
                        value="AUTHORIZED_THIRD_PARTY"
                        disabled={!data.thirdPartyAuth}
                      >
                        Registered third-party
                        {!data.thirdPartyAuth ? ' (not on file)' : ''}
                      </option>
                      <option value="CUSTOM">Other recipient (manual name)</option>
                    </Select>
                  </div>
                  {deliveredSignerRole === 'CUSTOM' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="deliveredSignerCustomName">
                        Recipient name (signature line)
                      </Label>
                      <Input
                        id="deliveredSignerCustomName"
                        value={deliveredSignerCustomName}
                        onChange={(e) => setDeliveredSignerCustomName(e.target.value)}
                        placeholder="Full name shown on POD"
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
              <Button type="submit" size="sm" className="w-full" disabled={addingEv}>
                {addingEv ? 'Adding…' : 'Add event'}
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold">Cost & payment</h3>
              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">
                    {data.totalCost
                      ? formatCurrency(data.totalCost)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid at</span>
                  <span className="font-medium">
                    {data.paidAt ? formatDateTime(data.paidAt) : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="font-medium">
                    {data.deliveredAt
                      ? formatDateTime(data.deliveredAt)
                      : '—'}
                  </span>
                </div>
                {data.deliveredSignerName ? (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Received by</span>
                    <span className="max-w-[60%] text-right font-medium">
                      {data.deliveredSignerName}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracking events</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.trackingEvents || data.trackingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ol className="space-y-3">
              {data.trackingEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">
                      {ev.label ?? ev.status}
                    </div>
                    {ev.location ? (
                      <div className="text-xs text-muted-foreground">
                        {ev.location}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <Badge variant={statusVariant(ev.status)}>
                      {ev.status}
                    </Badge>
                    <div className="mt-1">{formatDateTime(ev.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
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
