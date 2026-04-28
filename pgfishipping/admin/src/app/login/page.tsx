'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminLogin } from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';
import { isAdmin, useAuthStore } from '@/lib/store/auth';

export default function LoginPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner(): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const banner = params.get('error');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const r = await adminLogin(identifier, password);
      if (!isAdmin(r.user)) {
        setError('This account does not have admin privileges.');
        return;
      }
      setSession(r.user, r.tokens.accessToken, r.tokens.refreshToken);
      router.push('/');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>PGFI Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to the admin panel
          </p>
        </CardHeader>
        <CardContent>
          {banner === 'forbidden' ? (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              That account does not have admin access.
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-3">
            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or staff ID</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
