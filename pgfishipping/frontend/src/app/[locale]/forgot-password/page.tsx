'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { forgotPassword } from '@/lib/auth-api';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage(): JSX.Element {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [done, setDone] = useState(false);

  async function onSubmit(values: FormData): Promise<void> {
    await forgotPassword(values.email);
    setDone(true);
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
            <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              {t('resetSent')}
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {tErr('emailInvalid')}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? tc('loading') : t('resetAction')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
