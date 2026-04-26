'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone } from 'lucide-react';
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

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});
type FormData = z.infer<typeof schema>;

export default function SupportPage(): JSX.Element {
  const t = useTranslations('support');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormData): void {
    const body = `${values.message}\n\n— ${values.name} <${values.email}>`;
    const href = `mailto:support@pgfishipping.com?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') window.location.href = href;
    setSent(true);
  }

  return (
    <div className="container max-w-2xl space-y-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fallback')}</CardTitle>
          <CardDescription>
            <div className="mt-2 flex flex-col gap-2 text-foreground">
              <a
                href="mailto:support@pgfishipping.com"
                className="flex items-center gap-2 hover:text-primary"
              >
                <Mail className="h-4 w-4" /> support@pgfishipping.com
              </a>
              <a
                href="tel:+5092000000"
                className="flex items-center gap-2 hover:text-primary"
              >
                <Phone className="h-4 w-4" /> +509 2000-0000
              </a>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          {sent ? (
            <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              {t('sent')}
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{tErr('required')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{tErr('emailInvalid')}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t('subject')}</Label>
                <Input id="subject" {...register('subject')} />
                {errors.subject && (
                  <p className="text-xs text-destructive">{tErr('required')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t('message')}</Label>
                <textarea
                  id="message"
                  rows={6}
                  {...register('message')}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {errors.message && (
                  <p className="text-xs text-destructive">{tErr('required')}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('loading') : t('send')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
