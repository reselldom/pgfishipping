'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plane, Ship, Zap, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <div className="container max-w-2xl py-12">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              'flex flex-col items-center gap-1 text-xs font-medium',
              step >= s ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'h-1.5 w-full rounded-full',
                step >= s ? 'bg-primary' : 'bg-border',
              )}
            />
            {s === 1 && t('step1')}
            {s === 2 && t('step2')}
            {s === 3 && t('step3')}
            {s === 4 && t('step4')}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 && t('step1')}
            {step === 2 && t('step2')}
            {step === 3 && t('step3')}
            {step === 4 && t('step4')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      'flex items-center gap-3 rounded-md border p-4 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="font-medium">{t(`service.${s}`)}</span>
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
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('dimsHelp')}</p>
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
                        'rounded-md border px-3 py-2 text-sm transition-colors',
                        fobCurrency === c
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent',
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
            <div className="rounded-md border border-destructive/40 bg-red-50 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {step > 1 && step < 4 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> {tc('previous')}
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {step === 4 ? (
                <Button onClick={reset} variant="outline">
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
        </CardContent>
      </Card>
    </div>
  );
}

function EstimateResult({ result }: { result: CalculatorResult }): JSX.Element {
  const t = useTranslations('calculator');
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-secondary/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{t('total')}</span>
          <span className="text-3xl font-bold text-primary">
            ${result.totalUsd.toFixed(2)} USD
          </span>
        </div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">{t('totalHtg')}</span>
          <span className="font-medium">
            {result.totalHtg.toLocaleString()} HTG
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t('rate')}: 1 USD = {result.exchangeRate.toFixed(2)} HTG
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2 text-muted-foreground">
                {t('billable')}
              </td>
              <td className="px-4 py-2 text-right font-medium">
                {result.billableWeightLbs.toFixed(1)} lb
              </td>
            </tr>
            {result.lines.map((l) => (
              <tr key={l.feeType} className="border-b last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{l.name}</td>
                <td className="px-4 py-2 text-right">
                  ${l.amountUsd.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-secondary/30">
              <td className="px-4 py-2 font-medium">{t('subtotal')}</td>
              <td className="px-4 py-2 text-right font-medium">
                ${result.subtotalUsd.toFixed(2)}
              </td>
            </tr>
            {result.taxRate > 0 && (
              <tr>
                <td className="px-4 py-2 text-muted-foreground">
                  {t('tax')} ({(result.taxRate * 100).toFixed(1)}%)
                </td>
                <td className="px-4 py-2 text-right">
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
