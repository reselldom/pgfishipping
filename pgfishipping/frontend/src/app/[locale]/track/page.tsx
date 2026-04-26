'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Circle,
  Package,
  Plane,
  Warehouse,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { trackPublic, type PublicTracking } from '@/lib/public-api';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function TrackPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">
          Loading…
        </div>
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
    <div className="container max-w-3xl space-y-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('placeholder')}
          className="text-base"
        />
        <Button type="submit" disabled={loading}>
          {loading ? tc('loading') : t('search')}
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-red-50 p-4 text-sm text-destructive">
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{data.trackingCode}</CardTitle>
          <CardDescription>
            {data.status === 'DELIVERED' ? t('delivered') : steps[Math.max(data.step - 1, 0)]?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative pt-6">
            <div className="absolute inset-x-6 top-10 h-0.5 bg-border" />
            <div
              className="absolute inset-x-6 top-10 h-0.5 bg-primary transition-all"
              style={{
                width: `calc(${Math.max(0, (Math.min(data.step, 4) - 1) / 3) * 100}% - 0px)`,
                maxWidth: 'calc(100% - 3rem)',
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
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-colors',
                        completed
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        'mt-2 text-xs font-medium',
                        completed ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('service')} value={data.serviceType} />
            {data.weightLbs !== null && (
              <Row
                label={t('weight')}
                value={data.weightLbs.toFixed(1)}
              />
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
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('events')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ol className="space-y-3">
                {data.events.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <div className="mt-0.5 flex-none">
                      {i === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {e.label ?? e.status}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString()}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
