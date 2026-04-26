'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyEmail } from '@/lib/auth-api';

export default function VerifyEmailPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner(): JSX.Element {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const locale = useLocale();
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'pending' | 'success' | 'failed'>(
    'pending',
  );

  useEffect(() => {
    if (!token) {
      setState('failed');
      return;
    }
    verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('verifyTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'pending' && <p>{tc('loading')}</p>}
          {state === 'success' && (
            <>
              <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                {t('verifySuccess')}
              </p>
              <Link href={`/${locale}/login`}>
                <Button className="w-full">{t('loginAction')}</Button>
              </Link>
            </>
          )}
          {state === 'failed' && (
            <p className="rounded-md bg-red-50 p-4 text-sm text-destructive">
              {t('verifyFailed')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
