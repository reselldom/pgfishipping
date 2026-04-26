'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  changePassword,
  getMyProfile,
  updateMyProfile,
} from '@/lib/dashboard-api';
import { api, getApiErrorMessage } from '@/lib/api';
import { useToastStore } from '@/lib/store/toast';
import type { MyProfile } from '@/lib/types';

export default function SettingsPage(): JSX.Element {
  const t = useTranslations('settings');
  const ta = useTranslations('auth');
  const tc = useTranslations('common');
  const push = useToastStore((s) => s.push);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCell, setPhoneCell] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [language, setLanguage] = useState<'EN' | 'FR' | 'HT' | 'ES'>('EN');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setPhoneCell(p.phoneCell ?? '');
        setPhoneHome(p.phoneHome ?? '');
        setLanguage((p.language as 'EN' | 'FR' | 'HT' | 'ES') || 'EN');
      })
      .catch((err) => push({ kind: 'error', text: getApiErrorMessage(err) }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        firstName,
        lastName,
        phoneCell: phoneCell || null,
        phoneHome: phoneHome || null,
        language,
      });
      setProfile(updated);
      push({ kind: 'success', text: t('profileSaved') });
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPassword.length < 8) {
      push({
        kind: 'error',
        text: 'Password must be at least 8 characters.',
      });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      push({ kind: 'success', text: t('passwordChanged') });
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  }

  async function exportData(): Promise<void> {
    try {
      const r = await api.get('/user/data', { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pgfishipping-${profile?.customerCode || 'data'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({ kind: 'error', text: getApiErrorMessage(err) });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{ta('firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{ta('lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ''} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerCode">Customer code</Label>
              <Input
                id="customerCode"
                value={profile?.customerCode ?? ''}
                disabled
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneCell">{ta('phone')}</Label>
              <Input
                id="phoneCell"
                value={phoneCell}
                onChange={(e) => setPhoneCell(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneHome">Home phone</Label>
              <Input
                id="phoneHome"
                value={phoneHome}
                onChange={(e) => setPhoneHome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="language">{t('language')}</Label>
              <Select
                id="language"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as 'EN' | 'FR' | 'HT' | 'ES')
                }
              >
                <option value="EN">English</option>
                <option value="FR">Français</option>
                <option value="HT">Kreyòl</option>
                <option value="ES">Español</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('languageHelp')}
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? '…' : tc('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('password')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={savePassword}
            className="grid gap-4 max-w-md"
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Button
                type="submit"
                disabled={
                  savingPassword || !currentPassword || !newPassword
                }
              >
                {savingPassword ? '…' : t('password')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('data')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('exportHelp')}</p>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            {t('exportData')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
