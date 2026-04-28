'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Calculator as CalcIcon,
  Plane,
  Receipt,
  RefreshCw,
  Ship,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepTileRow } from '@/components/brand/step-tile';
import {
  estimateShipping,
  type CalculatorInput,
  type CalculatorResult,
  type ServiceType,
} from '@/lib/public-api';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function CalculatorPage(): JSX.Element {
  const t = useTranslations('calculator');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceType, setServiceType] = useState<ServiceType>('AIR');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [fobValue, setFobValue] = useState('');
  const [fobCurrency, setFobCurrency] = useState<'USD' | 'EUR'>('USD');

  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setStep(1);
    setResult(null);
    setError(null);
    setWeight('');
    setLength('');
    setWidth('');
    setHeight('');
    setFobValue('');
  }

  async function compute(): Promise<void> {
    setError(null);
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      setError(t('errors.weight'));
      return;
    }
    const input: CalculatorInput = {
      serviceType,
      weightLbs: w,
    };
    if (length && width && height) {
      input.length = parseFloat(length);
      input.width = parseFloat(width);
      input.height = parseFloat(height);
    }
    if (fobValue) {
      input.fobValue = parseFloat(fobValue);
      input.fobCurrency = fobCurrency;
    }
    setLoading(true);
    try {
      const r = await estimateShipping(input);
      setResult(r);
      setStep(4);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg === 'network' ? tErr('network') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          {t('title')}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('subtitle')}
        </h1>
      </div>

      {/* Liberty 3-step header (combine 1+2 = "Mi Paquete" UX into the 3 phases) */}
      <StepTileRow
        steps={[
          {
            n: 1,
            label: t('step1'),
            icon: <Plane className="h-4 w-4" />,
          },
          {
            n: 2,
            label: t('step2'),
            icon: <CalcIcon className="h-4 w-4" />,
          },
          {
            n: 3,
            label: step === 4 ? t('step4') : t('step3'),
            icon: <Receipt className="h-4 w-4" />,
          },
        ]}
        current={step >= 4 ? 3 : Math.min(step, 3)}
        className="mb-6"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-card">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <h2 className="text-base font-bold uppercase tracking-wide text-pg-navy">
            {step === 1 && t('step1')}
            {step === 2 && t('step2')}
            {step === 3 && t('step3')}
            {step === 4 && t('step4')}
          </h2>
        </div>

        <div className="space-y-5 p-6">
          {step === 1 && (
            <div className="grid gap-3">
              {(['AIR', 'EXPRESS', 'SEA'] as ServiceType[]).map((s) => {
                const Icon = s === 'AIR' ? Plane : s === 'SEA' ? Ship : Zap;
                const active = serviceType === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServiceType(s)}
                    className={cn(
                      'group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-white p-4 text-left transition-all',
                      active
                        ? 'border-pg-navy bg-pg-navy-50 shadow-card-lg'
                        : 'border-slate-200 hover:border-pg-navy/40 hover:bg-slate-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                        active ? 'bg-pg-navy text-white' : 'bg-slate-100 text-pg-muted',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <span className="block font-bold text-pg-navy">
                        {t(`service.${s}`)}
                      </span>
                    </div>
                    {/* Liberty-style red right-edge accent */}
                    <span
                      className={cn(
                        'absolute inset-y-0 right-0 w-1.5',
                        active ? 'bg-pg-red' : 'bg-transparent',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">{t('weight')}</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="num"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="length">{t('length')}</Label>
                  <Input
                    id="length"
                    type="number"
                    min="0"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="num"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">{t('width')}</Label>
                  <Input
                    id="width"
                    type="number"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="num"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">{t('height')}</Label>
                  <Input
                    id="height"
                    type="number"
                    min="0"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="num"
                  />
                </div>
              </div>
              <p className="text-xs text-pg-muted">{t('dimsHelp')}</p>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fobValue">{t('fobValue')}</Label>
                <Input
                  id="fobValue"
                  type="number"
                  min="0"
                  value={fobValue}
                  onChange={(e) => setFobValue(e.target.value)}
                  className="num"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fobCurrency')}</Label>
                <div className="flex gap-2">
                  {(['USD', 'EUR'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFobCurrency(c)}
                      className={cn(
                        'rounded-lg border-2 px-4 py-2 text-sm font-bold transition-colors',
                        fobCurrency === c
                          ? 'border-pg-navy bg-pg-navy text-white'
                          : 'border-slate-200 bg-white text-pg-navy hover:border-pg-navy/40',
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && result && <EstimateResult result={result} />}

          {error && (
            <div className="rounded-xl border border-pg-red/30 bg-pg-red-50 p-3 text-sm font-medium text-pg-red">
              {error}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {step > 1 && step < 4 && (
              <Button
                variant="outline"
                onClick={() =>
                  setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))
                }
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> {tc('previous')}
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {step === 4 ? (
                <Button onClick={reset} variant="gold">
                  <RefreshCw className="mr-1 h-4 w-4" /> {t('newQuote')}
                </Button>
              ) : step === 3 ? (
                <Button onClick={compute} disabled={loading}>
                  {loading ? tc('loading') : t('estimate')}
                </Button>
              ) : (
                <Button
                  onClick={() => setStep((s) => ((s + 1) as 1 | 2 | 3 | 4))}
                  disabled={step === 2 && !weight}
                >
                  {tc('next')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimateResult({ result }: { result: CalculatorResult }): JSX.Element {
  const t = useTranslations('calculator');
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-pg-navy bg-pg-navy text-white shadow-card-lg">
        <div className="space-y-1 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {t('total')}
          </p>
          <p className="num text-4xl font-extrabold sm:text-5xl">
            ${result.totalUsd.toFixed(2)}
            <span className="ml-1 text-base font-bold text-white/70">USD</span>
          </p>
          <p className="num text-sm text-white/80">
            {result.totalHtg.toLocaleString()} HTG
          </p>
          <p className="text-[11px] text-white/60">
            {t('rate')}: 1 USD = {result.exchangeRate.toFixed(2)} HTG
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pg-navy text-left text-xs font-bold uppercase tracking-wide text-white">
              <th className="px-4 py-2">Line</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50">
              <td className="px-4 py-2 text-pg-muted">{t('billable')}</td>
              <td className="num px-4 py-2 text-right font-semibold">
                {result.billableWeightLbs.toFixed(1)} lb
              </td>
            </tr>
            {result.lines.map((l) => (
              <tr key={l.feeType} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-pg-muted">{l.name}</td>
                <td className="num px-4 py-2 text-right">
                  ${l.amountUsd.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-2 font-bold text-pg-navy">{t('subtotal')}</td>
              <td className="num px-4 py-2 text-right font-bold text-pg-navy">
                ${result.subtotalUsd.toFixed(2)}
              </td>
            </tr>
            {result.taxRate > 0 && (
              <tr>
                <td className="px-4 py-2 text-pg-muted">
                  {t('tax')} ({(result.taxRate * 100).toFixed(1)}%)
                </td>
                <td className="num px-4 py-2 text-right">
                  ${result.taxUsd.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
