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
import { login as apiLogin } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';
import { toast } from '@/lib/store/toast';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage(): JSX.Element {
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
      const result = await apiLogin(values.email, values.password);
      setSession(result.user, result.tokens.accessToken);
      toast({ variant: 'success', title: t('loginTitle') });
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
          <CardTitle>{t('loginTitle')}</CardTitle>
          <CardDescription>{t('loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-destructive">{tErr('emailInvalid')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
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
              {isSubmitting ? tc('loading') : t('loginAction')}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Link
                href={`/${locale}/forgot-password`}
                className="text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
              <span>
                {t('noAccount')}{' '}
                <Link
                  href={`/${locale}/register`}
                  className="text-primary hover:underline"
                >
                  {t('signupHere')}
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
