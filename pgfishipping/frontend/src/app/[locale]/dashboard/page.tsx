'use client';

import { useTranslations } from 'next-intl';
import { RequireAuth } from '@/components/auth/require-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/auth';

export default function DashboardPage(): JSX.Element {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const t = useTranslations('common');
  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">
          {t('appName')} — Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xl">{user?.customerCode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all">{user?.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono">{user?.role}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Phases 12 and 13 will fill this dashboard with shipments, wallet, US
          address details, referral, gift cards, support, and settings.
        </CardContent>
      </Card>
    </div>
  );
}
