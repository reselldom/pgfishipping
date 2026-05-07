'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Send,
  MapPin,
  Package as PackageIcon,
  Plane,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shipments/status-badge';
import { useAuthStore } from '@/lib/store/auth';
import {
  getShipment,
  payShipment,
  setThirdPartyAuth,
  downloadShipmentLabelPdf,
  downloadShipmentInvoiceFile,
} from '@/lib/dashboard-api';
import { api, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/lib/store/toast';
import type { Shipment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatHaitiDeliveryLabel } from '@/lib/haiti-delivery-meta';

export default function ShipmentDetailPage(): JSX.Element {
  const t = useTranslations('shipmentDetail');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const push = useToastStore((s) => s.push);
  const user = useAuthStore((s) => s.user);

  const [ship, setShip] = useState<Shipment | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);

  const [auth, setAuth] = useState({
    authorizedName: '',
    idType: 'NIF',
    idNumber: '',
    phone: '',
  });
  const [savingAuth, setSavingAuth] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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

  useEffect(() => {
    const tp = ship?.thirdPartyAuth;
    if (!tp) return;
    setAuth({
      authorizedName: tp.authorizedName,
      idType: tp.idType || 'NIF',
      idNumber: tp.idNumber,
      phone: tp.phone,
    });
  }, [ship?.thirdPartyAuth]);

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
      await refresh();
      setShowAuthForm(false);
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

  async function downloadLabelPdf(): Promise<void> {
    if (!ship) return;
    setDownloadingLabel(true);
    try {
      await downloadShipmentLabelPdf(ship.id, ship.trackingCode);
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setDownloadingLabel(false);
    }
  }

  async function downloadInvoiceFromServer(): Promise<void> {
    if (!ship) return;
    setDownloadingInvoice(true);
    try {
      await downloadShipmentInvoiceFile(ship.id, ship.trackingCode);
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setDownloadingInvoice(false);
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
          className="inline-flex items-center gap-1 text-sm text-brand-navy hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error || 'Not found'}
        </div>
      </div>
    );
  }

  const dims =
    ship.dimensionLength && ship.dimensionWidth && ship.dimensionHeight
      ? `${ship.dimensionLength} × ${ship.dimensionWidth} × ${ship.dimensionHeight}`
      : `0 × 0 × 0`;

  const customerCode = user?.customerCode ?? '';
  const customerName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : '';

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/${locale}/dashboard/shipments`}>
          <Button
            variant="default"
            size="sm"
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('back')}
          </Button>
        </Link>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-mono text-sm font-semibold text-brand-navy">
            {customerName}
          </div>
          <div className="font-mono text-sm font-semibold text-brand-red">
            {customerCode}
          </div>
          <div className="mt-0.5">
            {t('shipmentNo')}{' '}
            <span className="font-mono font-semibold text-foreground">
              {ship.trackingCode}
            </span>
          </div>
        </div>
      </div>

      {/* 4 color-coded info cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          color="navy"
          title={t('cardSender')}
          chip={customerCode}
          icon={<Send className="h-4 w-4" />}
        >
          <div className="text-sm font-semibold text-brand-navy">
            {customerName || '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ship.originCountry || 'United States'}
          </div>
          {user?.email ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {user.email}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard
          color="red"
          title={t('cardRecipient')}
          chip={customerCode}
          icon={<MapPin className="h-4 w-4" />}
        >
          <div className="text-sm font-semibold text-brand-red">
            {ship.recipientName || customerName || '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ship.destinationCountry || 'Haiti'}
          </div>
          {formatHaitiDeliveryLabel(
            ship.haitiDepartmentKey,
            ship.haitiDeliveryCity,
          ) ? (
            <div className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{t('haitiPickup')}:</span>{' '}
              {formatHaitiDeliveryLabel(
                ship.haitiDepartmentKey,
                ship.haitiDeliveryCity,
              )}
            </div>
          ) : null}
          {ship.recipientPhone ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {ship.recipientPhone}
            </div>
          ) : null}
        </InfoCard>

        <InfoCard
          color="navy"
          title={t('cardContents')}
          icon={<PackageIcon className="h-4 w-4" />}
        >
          <KV label={t('vendor')} value={ship.vendor} />
          <KV label={t('carrier')} value={ship.externalCarrier} />
          <KV
            label={t('carrierTracking')}
            value={ship.externalTracking}
            mono
          />
          <KV
            label="Contents"
            value={ship.contentsDescription}
          />
        </InfoCard>

        <InfoCard
          color="red"
          title={t('cardShipment')}
          icon={<Plane className="h-4 w-4" />}
        >
          <KV label={t('service')} value={t('serviceDesc')} />
          <KV
            label={t('destination')}
            value={ship.destinationCountry || 'Haiti'}
          />
          <KV label={t('package')} value="1/1" />
          <KV label={t('dimension')} value={dims} />
          <KV
            label={`${t('weight')} (LBS)`}
            value={ship.weightLbs ? ship.weightLbs.toFixed(2) : '0.00'}
          />
        </InfoCard>
      </div>

      {/* Status + Options row */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          color="navy"
          title={t('cardStatus')}
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          <div className="flex items-center gap-2">
            <StatusBadge status={ship.status} />
            <span className="text-xs text-muted-foreground">
              {new Date(ship.createdAt).toLocaleString()}
            </span>
          </div>
          {ship.totalCost !== null ? (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">{t('totalCost')}: </span>
              <span className="font-semibold">
                ${ship.totalCost.toFixed(2)} USD
              </span>{' '}
              ·{' '}
              <span
                className={cn(
                  'font-semibold',
                  ship.isPaid ? 'text-emerald-600' : 'text-amber-600',
                )}
              >
                {ship.isPaid ? t('paid') : t('unpaid')}
              </span>
            </div>
          ) : null}
          {ship.deliveredAt ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('deliveredAt')}: {new Date(ship.deliveredAt).toLocaleString()}
            </div>
          ) : null}
          {ship.deliveredSignerName ? (
            <div className="mt-2 text-xs text-muted-foreground">
              {t('receivedBy')}:{' '}
              <span className="font-semibold text-foreground">
                {ship.deliveredSignerName}
              </span>
            </div>
          ) : null}
        </InfoCard>

        <InfoCard
          color="navy"
          title={t('cardOptions')}
          icon={<FileText className="h-4 w-4" />}
        >
          <div className="-mt-1 flex flex-wrap gap-2">
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
              size="sm"
              className="bg-brand-navy text-white hover:bg-brand-navy/90"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {uploading ? '…' : t('uploadInvoice')}
            </Button>

            <Button
              size="sm"
              className="bg-brand-red text-white hover:bg-brand-red/90"
              onClick={() => setShowAuthForm((v) => !v)}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              {t('thirdParty')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={downloadingLabel}
              onClick={() => void downloadLabelPdf()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {downloadingLabel ? '…' : t('downloadLabel')}
            </Button>

            {ship.invoiceUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingInvoice}
                onClick={() => void downloadInvoiceFromServer()}
              >
                <FileText className="mr-1.5 h-4 w-4" />
                {downloadingInvoice ? '…' : t('invoiceOnFile')}
              </Button>
            ) : null}

            {ship.totalCost && !ship.isPaid ? (
              <Button
                size="sm"
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={paying}
                onClick={pay}
              >
                <CreditCard className="mr-1.5 h-4 w-4" />
                {paying ? '…' : t('pay')}
              </Button>
            ) : null}
          </div>

          {showAuthForm ? (
            <form
              onSubmit={saveAuth}
              className="mt-4 space-y-3 rounded-md border bg-secondary/20 p-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="authName" className="text-xs font-semibold">
                  {t('authName')}
                </Label>
                <Input
                  id="authName"
                  value={auth.authorizedName}
                  onChange={(e) =>
                    setAuth({ ...auth, authorizedName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="authPhone" className="text-xs font-semibold">
                    {t('authPhone')}
                  </Label>
                  <Input
                    id="authPhone"
                    value={auth.phone}
                    onChange={(e) =>
                      setAuth({ ...auth, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idType" className="text-xs font-semibold">
                    {t('authIdType')}
                  </Label>
                  <Input
                    id="idType"
                    value={auth.idType}
                    onChange={(e) =>
                      setAuth({ ...auth, idType: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idNumber" className="text-xs font-semibold">
                  {t('authIdNumber')}
                </Label>
                <Input
                  id="idNumber"
                  value={auth.idNumber}
                  onChange={(e) =>
                    setAuth({ ...auth, idNumber: e.target.value })
                  }
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full bg-brand-navy hover:bg-brand-navy/90"
                disabled={savingAuth}
              >
                {savingAuth ? '…' : t('saveAuth')}
              </Button>
            </form>
          ) : null}
        </InfoCard>
      </div>

      {ship.thirdPartyAuth ? (
        <div className="rounded-xl border border-brand-navy/30 bg-brand-navy/5 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-brand-navy">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <h2 className="text-lg font-semibold">{t('thirdPartyAuthTitle')}</h2>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <KV
              label={t('authName')}
              value={ship.thirdPartyAuth.authorizedName}
            />
            <KV label={t('authPhone')} value={ship.thirdPartyAuth.phone} />
            <KV label={t('authIdType')} value={ship.thirdPartyAuth.idType} />
            <KV label={t('authIdNumber')} value={ship.thirdPartyAuth.idNumber} />
            <KV
              label={t('thirdPartyRecordedAt')}
              value={new Date(ship.thirdPartyAuth.createdAt).toLocaleString()}
            />
          </div>
        </div>
      ) : null}

      {/* Tracking events */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-navy">
          {t('trackingEvents')}
        </h2>
        {!ship.trackingEvents || ship.trackingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noEvents')}</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-brand-navy/30 pl-6">
            {ship.trackingEvents.map((ev, idx) => (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-card',
                    idx === 0 ? 'border-brand-red' : 'border-brand-navy',
                  )}
                />
                <div className="text-sm font-semibold text-foreground">
                  {ev.label || ev.status}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(ev.timestamp).toLocaleString()}
                  {ev.location ? ` · ${ev.location}` : ''}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  color,
  title,
  chip,
  icon,
  children,
}: {
  color: 'navy' | 'red';
  title: string;
  chip?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  const headerClass =
    color === 'navy'
      ? 'bg-brand-navy text-white'
      : 'bg-brand-red text-white';
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold',
          headerClass,
        )}
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          {title}
        </span>
        {chip ? (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide">
            {chip}
          </span>
        ) : null}
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[8ch_1fr] items-baseline gap-x-2 gap-y-1 text-xs">
      <span className="font-semibold text-muted-foreground">{label}:</span>
      <span
        className={cn(
          'truncate text-foreground',
          mono && 'font-mono text-[12px]',
        )}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}
