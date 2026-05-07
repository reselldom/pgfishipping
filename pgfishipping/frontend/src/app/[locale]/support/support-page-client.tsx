'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorCard } from '@/components/brand/color-card';
import type { FooterPhoneLine } from '@/lib/public-api';
import { telHref } from '@/lib/contact-display';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});
type FormData = z.infer<typeof schema>;

const FALLBACK_EMAIL = 'support@pgfishipping.com';

export function SupportPageClient({
  footerEmail,
  footerPhones,
}: {
  footerEmail: string;
  footerPhones: FooterPhoneLine[];
}): JSX.Element {
  const t = useTranslations('support');
  const tc = useTranslations('common');
  const tErr = useTranslations('errors');
  const [sent, setSent] = useState(false);

  const email = footerEmail.trim() || FALLBACK_EMAIL;
  const phones = footerPhones.filter((p) => p.number?.trim());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormData): void {
    const body = `${values.message}\n\n— ${values.name} <${values.email}>`;
    const href = `mailto:${email}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') window.location.href = href;
    setSent(true);
  }

  return (
    <div className="container max-w-2xl space-y-6 py-12">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          PGFI Shipping
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-pg-muted">{t('subtitle')}</p>
      </div>

      <ColorCard tone="navy" title={t('fallback')}>
        <div className="flex flex-col gap-3 text-sm">
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 font-semibold text-pg-ink transition-colors hover:text-pg-orange"
          >
            <Mail className="h-4 w-4 shrink-0 text-pg-navy" /> {email}
          </a>
          <div className="flex flex-col gap-2">
            {phones.length > 0 ? (
              phones.map((line, idx) => (
                <a
                  key={`${line.number}-${idx}`}
                  href={telHref(line.number)}
                  className="flex items-start gap-2 font-semibold text-pg-ink transition-colors hover:text-pg-orange"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-pg-navy" />
                  <span>
                    {line.label ? (
                      <span className="block text-xs font-normal text-pg-muted">
                        {line.label}
                      </span>
                    ) : null}
                    <span className="num">{line.number}</span>
                  </span>
                </a>
              ))
            ) : (
              <p className="text-sm text-pg-muted">{t('noPhones')}</p>
            )}
          </div>
          <p className="text-xs text-pg-muted">{t('phonesFromFooter')}</p>
        </div>
      </ColorCard>

      <ColorCard tone="red" title={t('send')}>
        {sent ? (
          <div className="flex items-start gap-3 rounded-xl border border-pg-mint/30 bg-pg-mint-50 p-4 text-sm text-pg-ink">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-pg-mint" />
            <span>{t('sent')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-pg-red">{tErr('required')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-pg-red">{tErr('emailInvalid')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">{t('subject')}</Label>
              <Input id="subject" {...register('subject')} />
              {errors.subject && (
                <p className="text-xs text-pg-red">{tErr('required')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('message')}</Label>
              <textarea
                id="message"
                rows={6}
                {...register('message')}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-pg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pg-orange focus-visible:ring-offset-2"
              />
              {errors.message && (
                <p className="text-xs text-pg-red">{tErr('required')}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('loading') : t('send')}
            </Button>
          </form>
        )}
      </ColorCard>
    </div>
  );
}
