'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Circle,
  MapPin,
  Package,
  Plane,
  Search,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorCard } from '@/components/brand/color-card';
import { trackPublic, type PublicTracking } from '@/lib/public-api';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function TrackPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-center text-pg-muted">Loading…</div>
      }
    >
      <TrackInner />
    </Suspense>
  );
}

function TrackInner(): JSX.Element {
  const t = useTranslations('track');
  const tErr = useTranslations('errors');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get('code') ?? '';

  const [code, setCode] = useState(initial);
  const [data, setData] = useState<PublicTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(c: string): Promise<void> {
    const trimmed = c.trim();
    if (!trimmed) {
      setError(t('invalid'));
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await trackPublic(trimmed);
      setData(result);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setData(null);
      setError(
        msg === 'network'
          ? tErr('network')
          : msg.toLowerCase().includes('not found')
            ? t('notFound')
            : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial) {
      void search(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (code) next.set('code', code);
    else next.delete('code');
    router.replace(`${pathname}?${next.toString()}`);
    void search(code);
  }

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-pg-navy p-8 text-center text-white shadow-card-lg sm:p-10">
        <div className="brand-stripe-top absolute inset-x-0 top-0 h-2" />
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80 sm:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={onSubmit}
        className="-mt-12 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-card p-3 shadow-card-lg sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-pg-muted"
            aria-hidden
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('placeholder')}
            className="num h-12 border-0 pl-11 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          type="submit"
          variant="orange"
          disabled={loading}
          className="h-12 rounded-xl px-8 text-base font-semibold"
        >
          {loading ? tc('loading') : t('search')}
        </Button>
      </form>

      {error && (
        <div className="rounded-xl border border-pg-red/30 bg-pg-red-50 p-4 text-sm font-medium text-pg-red">
          {error}
        </div>
      )}

      {data && <TrackingDetails data={data} />}
    </div>
  );
}

function TrackingDetails({ data }: { data: PublicTracking }): JSX.Element {
  const t = useTranslations('track');
  const steps = [
    { key: 'step1', icon: Package, label: t('step1') },
    { key: 'step2', icon: Warehouse, label: t('step2') },
    { key: 'step3', icon: Plane, label: t('step3') },
    { key: 'step4', icon: MapPin, label: t('step4') },
  ];
  const currentStep = Math.max(1, Math.min(data.step, 4));
  const progress = ((currentStep - 1) / 3) * 100;

  return (
    <div className="space-y-6">
      {/* Big status banner */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-card">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-6 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
              {t('summary')}
            </p>
            <p className="num mt-1 font-display text-2xl font-extrabold text-pg-navy">
              {data.trackingCode}
            </p>
          </div>
          <p className="text-2xl font-extrabold uppercase tracking-wide text-pg-orange sm:text-3xl">
            {data.status === 'DELIVERED'
              ? t('delivered')
              : steps[currentStep - 1]?.label}
          </p>
        </div>

        {/* Shippex-style orange stepper */}
        <div className="px-6 py-8 sm:px-10">
          <div className="relative">
            <div className="absolute left-6 right-6 top-6 h-1 rounded-full bg-slate-200" />
            <div
              className="absolute left-6 top-6 h-1 rounded-full bg-pg-orange transition-all"
              style={{
                width: `calc((100% - 3rem) * ${progress / 100})`,
              }}
            />
            <div className="relative grid grid-cols-4 gap-2">
              {steps.map((s, i) => {
                const completed = data.step >= i + 1;
                const Icon = s.icon;
                return (
                  <div
                    key={s.key}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-card transition-colors',
                        completed
                          ? 'bg-pg-orange text-white'
                          : 'bg-slate-100 text-pg-muted',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        'mt-3 text-xs font-bold uppercase tracking-wide sm:text-sm',
                        completed ? 'text-pg-orange' : 'text-pg-muted',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary + Events as Liberty-style color-coded cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <ColorCard tone="navy" title={t('summary')}>
          <dl className="space-y-2 text-sm">
            <Row label={t('service')} value={data.serviceType} />
            {data.weightLbs !== null && (
              <Row label={t('weight')} value={`${data.weightLbs.toFixed(1)} lbs`} />
            )}
            {data.destinationCountry && (
              <Row label={t('destination')} value={data.destinationCountry} />
            )}
            <Row
              label={t('createdAt')}
              value={new Date(data.createdAt).toLocaleString()}
            />
            {data.deliveredAt && (
              <Row
                label={t('deliveredAt')}
                value={new Date(data.deliveredAt).toLocaleString()}
              />
            )}
            {data.externalCarrier && (
              <Row label={t('carrier')} value={data.externalCarrier} />
            )}
            {data.externalTracking && (
              <Row
                label={t('carrierTracking')}
                value={data.externalTracking}
                mono
              />
            )}
          </dl>
        </ColorCard>

        <ColorCard tone="red" title={t('events')}>
          {data.events.length === 0 ? (
            <p className="text-sm text-pg-muted">—</p>
          ) : (
            <ol className="space-y-3">
              {data.events.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="mt-0.5 flex-none">
                    {i === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-pg-mint" />
                    ) : (
                      <Circle className="h-4 w-4 text-pg-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-pg-ink">
                      {e.label ?? e.status}
                    </div>
                    <div className="text-xs text-pg-muted">
                      {new Date(e.timestamp).toLocaleString()}
                      {e.location ? ` · ${e.location}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ColorCard>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0">
      <dt className="text-pg-muted">{label}</dt>
      <dd
        className={cn(
          'font-semibold text-pg-ink',
          mono && 'num font-mono text-xs',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
