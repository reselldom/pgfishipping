'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { SocialFooterLinks } from './social-footer-links';
import {
  fetchPublicFooterContent,
  type PublicFooterContent,
  type FooterLocationBlock,
} from '@/lib/public-api';

const EMPTY: PublicFooterContent = {
  phones: [],
  email: '',
  businessHours: '',
  usaLocations: [],
  haitiLocations: [],
};

function LocationColumn({
  title,
  items,
}: {
  title: string;
  items: FooterLocationBlock[];
}): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0">
      <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
        {title}
      </h3>
      <ul className="space-y-2.5 text-xs leading-snug text-white/75">
        {items.map((loc, i) => (
          <li key={`${loc.title}-${i}`} className="min-w-0">
            <p className="font-semibold text-white/95">{loc.title}</p>
            {loc.detail ? (
              <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-white/72">
                {loc.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('common');
  const tn = useTranslations('nav');
  const tf = useTranslations('footer');
  const [data, setData] = useState<PublicFooterContent>(EMPTY);

  useEffect(() => {
    void (async () => {
      setData(await fetchPublicFooterContent());
    })();
  }, []);

  const hasContact =
    data.phones.length > 0 ||
    Boolean(data.email?.trim()) ||
    Boolean(data.businessHours?.trim());

  const year = new Date().getFullYear();

  const links: Array<{ href: string; label: string }> = [
    { href: '/track', label: tn('track') },
    { href: '/calculator', label: tn('calculator') },
    { href: '/addresses', label: tn('addresses') },
    { href: '/support', label: tn('support') },
    { href: '/about', label: tn('about') },
    { href: '/terms', label: tn('terms') },
    { href: '/privacy', label: tn('privacy') },
  ];

  return (
    <footer className="relative mt-auto bg-pg-navy text-white/90">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="container py-8 md:py-9">
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between xl:gap-12">
          {/* Brand + quick links */}
          <div className="min-w-0 space-y-3 xl:max-w-[17rem] xl:shrink-0">
            <Link
              href={`/${locale}`}
              className="inline-block transition-opacity hover:opacity-90"
            >
              <Logo
                size="lg"
                className="h-10 w-auto max-w-[200px] object-contain object-left drop-shadow-sm"
              />
            </Link>
            <p className="max-w-[15rem] text-[11px] leading-snug text-white/62">
              {t('tagline')}
            </p>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/52">
                {tf('quickLinks')}
              </p>
              <nav
                className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium uppercase tracking-wide text-white/75"
                aria-label={tf('quickLinks')}
              >
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={`/${locale}${l.href}`}
                    className="transition-colors hover:text-pg-orange"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Contact + USA + Haiti */}
          <div className="grid min-w-0 flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
            {hasContact ? (
              <section
                className="min-w-0 space-y-3"
                aria-labelledby="footer-contact-heading"
              >
                <h2 id="footer-contact-heading" className="sr-only">
                  {tf('contact')}
                </h2>
                {data.businessHours?.trim() ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                      {tf('hours')}
                    </p>
                    <p className="whitespace-pre-line text-[11px] leading-relaxed text-white/78">
                      {data.businessHours.trim()}
                    </p>
                  </div>
                ) : null}
                {data.phones.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                      {tf('phones')}
                    </p>
                    <ul className="space-y-2.5">
                      {data.phones.map((line, idx) => (
                        <li key={`${line.number}-${idx}`}>
                          <a
                            href={`tel:${line.number.trim().replace(/\s/g, '')}`}
                            className="group block text-[11px] text-white/78 transition-colors hover:text-white"
                          >
                            {line.label?.trim() ? (
                              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-white/55">
                                {line.label.trim()}
                              </span>
                            ) : null}
                            <span className="inline-flex items-start gap-1.5">
                              <ArrowRight
                                className="mt-0.5 h-3 w-3 shrink-0 text-white/45 group-hover:text-white/70"
                                aria-hidden
                              />
                              <span className="break-all">{line.number}</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {data.email ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                      {tf('emailLabel')}
                    </p>
                    <a
                      href={`mailto:${data.email}`}
                      className="break-all text-[11px] text-white/78 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      {data.email}
                    </a>
                  </div>
                ) : null}
              </section>
            ) : null}

            {data.usaLocations.length > 0 ? (
              <div className="min-w-0">
                <LocationColumn title={tf('usa')} items={data.usaLocations} />
              </div>
            ) : null}

            {data.haitiLocations.length > 0 ? (
              <div className="min-w-0 sm:max-lg:col-span-2 lg:col-span-1">
                <LocationColumn title={tf('haiti')} items={data.haitiLocations} />
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col xl:flex-1 xl:items-end">
            <SocialFooterLinks className="w-full justify-end gap-3" />
          </div>
        </div>
      </div>

      <div className="brand-stripe-bottom h-1.5" aria-hidden />
      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-[11px] leading-relaxed text-white/55">
          <span>{tf('copyrightPrefix', { year })}</span>{' '}
          <Link
            href={`/${locale}`}
            className="font-semibold text-white/82 underline-offset-2 hover:text-white hover:underline"
          >
            {t('appName')}
          </Link>{' '}
          <span>{tf('copyrightSuffix')}</span>
        </div>
      </div>
    </footer>
  );
}
