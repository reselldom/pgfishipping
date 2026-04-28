'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useAuthStore } from '@/lib/store/auth';
import { register as apiRegister } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';
import { toast } from '@/lib/store/toast';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phoneCell: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage(): JSX.Element {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: FormData): Promise<void> {
    setServerError(null);
    try {
      const result = await apiRegister({
        ...values,
        language: locale.toUpperCase(),
      });
      setSession(
        result.user,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
      toast({ variant: 'success', title: t('registerTitle') });
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      const code = getApiErrorMessage(err);
      setServerError(
        code === 'network'
          ? tErr('network')
          : code === 'generic'
            ? tErr('generic')
            : code,
      );
    }
  }

  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('registerTitle')}</CardTitle>
          <CardDescription>{t('registerSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstName')}</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{tErr('required')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastName')}</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{tErr('required')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-destructive">{tErr('emailInvalid')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneCell">{t('phone')}</Label>
              <Input id="phoneCell" type="tel" autoComplete="tel" {...register('phoneCell')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{tErr('passwordMin')}</p>
              )}
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? tc('loading') : t('registerAction')}
            </Button>
            <p className="text-center text-sm">
              {t('haveAccount')}{' '}
              <Link
                href={`/${locale}/login`}
                className="text-primary hover:underline"
              >
                {t('loginHere')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
