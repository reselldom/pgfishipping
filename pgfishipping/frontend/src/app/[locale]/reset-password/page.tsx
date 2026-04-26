'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { resetPassword } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

const schema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner(): JSX.Element {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: FormData): Promise<void> {
    setServerError(null);
    try {
      await resetPassword(token, values.newPassword);
      setDone(true);
    } catch (err) {
      const code = getApiErrorMessage(err);
      setServerError(code === 'network' ? tErr('network') : code);
    }
  }

  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('resetTitle')}</CardTitle>
          <CardDescription>{t('resetSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3">
              <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                {t('passwordChanged')}
              </p>
              <Link href={`/${locale}/login`}>
                <Button className="w-full">{t('loginAction')}</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{tErr('passwordMin')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? tc('loading') : t('saveNewPassword')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
