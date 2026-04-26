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
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
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
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border">
          <div className="brand-stripe-top h-16" />

          <div className="px-8 pb-8 pt-6">
            <div className="mb-6 flex justify-center">
              <Logo size="xl" />
            </div>

            <h1 className="text-2xl font-bold text-foreground">
              {t('loginTitle')}
            </h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              {t('loginSubtitle')}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-semibold">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {tErr('emailInvalid')}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-semibold">
                  {t('password')} <span className="text-brand-red">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="h-11"
                />
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {tErr('passwordMin')}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-brand-navy text-base font-semibold hover:bg-brand-navy/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? tc('loading') : t('loginAction')}
              </Button>

              <div className="pt-1">
                <LanguageSwitcher />
              </div>
            </form>

            <div className="mt-6 space-y-2 border-t pt-5 text-center text-sm">
              <p>
                {t('noAccount')}{' '}
                <Link
                  href={`/${locale}/register`}
                  className="font-semibold text-brand-red hover:underline"
                >
                  {t('signupHere')}
                </Link>
              </p>
              <p>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="font-semibold text-brand-navy hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </p>
            </div>
          </div>

          <div className="brand-stripe-bottom h-16" />
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          PGFI Shipping — Haiti&apos;s trusted package forwarder
        </p>
      </div>
    </div>
  );
}
