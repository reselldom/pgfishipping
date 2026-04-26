'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Upload, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shipments/status-badge';
import {
  getShipment,
  payShipment,
  setThirdPartyAuth,
} from '@/lib/dashboard-api';
import { api, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/lib/store/toast';
import type { Shipment } from '@/lib/types';

export default function ShipmentDetailPage(): JSX.Element {
  const t = useTranslations('shipmentDetail');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const push = useToastStore((s) => s.push);

  const [ship, setShip] = useState<Shipment | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 3rd-party auth form
  const [auth, setAuth] = useState({
    authorizedName: '',
    idType: 'NIF',
    idNumber: '',
    phone: '',
  });
  const [savingAuth, setSavingAuth] = useState(false);

  // Invoice upload
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Pay
  const [paying, setPaying] = useState(false);

  async function refresh(): Promise<void> {
    try {
      const s = await getShipment(id);
      setShip(s);
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

  async function uploadInvoice(file: File): Promise<void> {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/shipments/${id}/invoice`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      push({ kind: 'success', text: 'Invoice uploaded' });
      await refresh();
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  }

  async function saveAuth(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingAuth(true);
    try {
      await setThirdPartyAuth(id, auth);
      push({ kind: 'success', text: t('authSaved') });
      setAuth({ authorizedName: '', idType: 'NIF', idNumber: '', phone: '' });
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setSavingAuth(false);
    }
  }

  async function pay(): Promise<void> {
    if (!ship?.totalCost) return;
    if (!confirm(t('payConfirmTitle'))) return;
    setPaying(true);
    try {
      await payShipment(ship.id, ship.totalCost);
      push({ kind: 'success', text: t('paySuccess') });
      await refresh();
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (error || !ship) {
    return (
      <div className="space-y-3">
        <Link
          href={`/${locale}/dashboard/shipments`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || 'Not found'}
        </div>
      </div>
    );
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/dashboard/shipments`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-mono">{ship.trackingCode}</h1>
          <p className="text-muted-foreground">
            {ship.contentsDescription || ship.vendor || '—'}
          </p>
        </div>
        <StatusBadge status={ship.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label={t('carrier')} value={ship.externalCarrier} />
              <Row
                label={t('carrierTracking')}
                value={ship.externalTracking}
                mono
              />
              <Row
                label={t('weight')}
                value={ship.weightLbs ? `${ship.weightLbs} lb` : null}
              />
              <Row label={t('service')} value={ship.serviceType} />
              <Row label={t('vendor')} value={ship.vendor} />
              <Row label={t('destination')} value={ship.destinationCountry} />
              <Row label={t('recipient')} value={ship.recipientName} />
              <Row
                label={t('createdAt')}
                value={new Date(ship.createdAt).toLocaleString()}
              />
              <Row
                label={t('fob')}
                value={
                  ship.fobValue
                    ? `${ship.fobValue} ${ship.fobCurrency ?? 'USD'}`
                    : null
                }
              />
              {ship.deliveredAt ? (
                <Row
                  label={t('deliveredAt')}
                  value={new Date(ship.deliveredAt).toLocaleString()}
                />
              ) : null}
              {ship.totalCost !== null ? (
                <Row
                  label={t('totalCost')}
                  value={
                    <span className="font-medium">
                      ${ship.totalCost.toFixed(2)} USD —{' '}
                      <span
                        className={
                          ship.isPaid
                            ? 'text-green-700'
                            : 'text-amber-700'
                        }
                      >
                        {ship.isPaid ? t('paid') : t('unpaid')}
                      </span>
                    </span>
                  }
                />
              ) : null}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={`${apiBase}/shipments/${ship.id}/label`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadLabel')}
                </Button>
              </a>

              <input
                type="file"
                ref={fileInput}
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadInvoice(f);
                  e.currentTarget.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? '…' : t('uploadInvoice')}
              </Button>

              {ship.invoiceUrl ? (
                <a
                  href={ship.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border bg-secondary/30 px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  <FileText className="h-4 w-4" />
                  {t('invoiceOnFile')} — {t('viewInvoice')}
                </a>
              ) : null}

              {ship.totalCost && !ship.isPaid ? (
                <Button size="sm" disabled={paying} onClick={pay}>
                  {paying ? '…' : t('pay')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('thirdParty')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="authName">{t('authName')}</Label>
                <Input
                  id="authName"
                  value={auth.authorizedName}
                  onChange={(e) =>
                    setAuth({ ...auth, authorizedName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="authPhone">{t('authPhone')}</Label>
                <Input
                  id="authPhone"
                  value={auth.phone}
                  onChange={(e) => setAuth({ ...auth, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="idType">{t('authIdType')}</Label>
                  <Input
                    id="idType"
                    value={auth.idType}
                    onChange={(e) =>
                      setAuth({ ...auth, idType: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idNumber">{t('authIdNumber')}</Label>
                  <Input
                    id="idNumber"
                    value={auth.idNumber}
                    onChange={(e) =>
                      setAuth({ ...auth, idNumber: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={savingAuth}
              >
                {savingAuth ? '…' : t('saveAuth')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('trackingEvents')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!ship.trackingEvents || ship.trackingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noEvents')}</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {ship.trackingEvents.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="text-sm font-medium">
                    {ev.label || ev.status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(ev.timestamp).toLocaleString()}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </div>
                  {ev.notes ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {ev.notes}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm'}>
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
