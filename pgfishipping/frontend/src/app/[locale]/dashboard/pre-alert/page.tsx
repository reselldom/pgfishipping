'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPreAlert } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/lib/store/toast';

const schema = z.object({
  serviceType: z.enum(['AIR', 'SEA', 'EXPRESS']),
  externalTracking: z.string().max(80).optional(),
  externalCarrier: z.string().max(40).optional(),
  vendor: z.string().max(80).optional(),
  contentsDescription: z.string().max(500).optional(),
  weightLbs: z.coerce.number().positive().max(2000).optional(),
  fobValue: z.coerce.number().nonnegative().optional(),
  fobCurrency: z.enum(['USD', 'EUR']).optional(),
  recipientName: z.string().max(120).optional(),
  recipientPhone: z.string().max(40).optional(),
  additionalNotes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function PreAlertPage(): JSX.Element {
  const t = useTranslations('preAlertForm');
  const locale = useLocale();
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [serverError, setServerError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'AIR', fobCurrency: 'USD' },
  });

  async function onSubmit(values: FormData): Promise<void> {
    setServerError('');
    try {
      const ship = await createPreAlert(values);
      push({ kind: 'success', text: t('success') });
      router.push(`/${locale}/dashboard/shipments/${ship.id}`);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {serverError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="serviceType">{t('service')}</Label>
                <Select id="serviceType" {...register('serviceType')}>
                  <option value="AIR">AIR</option>
                  <option value="SEA">SEA</option>
                  <option value="EXPRESS">EXPRESS</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="externalCarrier">{t('carrier')}</Label>
                <Input
                  id="externalCarrier"
                  placeholder="USPS, FedEx, UPS…"
                  {...register('externalCarrier')}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="externalTracking">{t('tracking')}</Label>
                <Input
                  id="externalTracking"
                  placeholder="9400 1118 …"
                  {...register('externalTracking')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor">{t('vendor')}</Label>
                <Input id="vendor" placeholder="Amazon, eBay…" {...register('vendor')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weightLbs">{t('weight')}</Label>
                <Input
                  id="weightLbs"
                  type="number"
                  step="0.1"
                  {...register('weightLbs')}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contentsDescription">{t('description')}</Label>
                <Textarea
                  id="contentsDescription"
                  rows={2}
                  {...register('contentsDescription')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fobValue">{t('fobValue')}</Label>
                <Input
                  id="fobValue"
                  type="number"
                  step="0.01"
                  {...register('fobValue')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fobCurrency">{t('fobCurrency')}</Label>
                <Select id="fobCurrency" {...register('fobCurrency')}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">{t('recipientName')}</Label>
                <Input id="recipientName" {...register('recipientName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientPhone">{t('recipientPhone')}</Label>
                <Input id="recipientPhone" {...register('recipientPhone')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="additionalNotes">{t('notes')}</Label>
                <Textarea
                  id="additionalNotes"
                  rows={3}
                  {...register('additionalNotes')}
                />
              </div>
            </div>

            {Object.keys(errors).length > 0 ? (
              <p className="text-xs text-destructive">
                Please review the highlighted fields.
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '…' : t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
