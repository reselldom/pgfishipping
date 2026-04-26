'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  MapPin,
  Plane,
  Search,
  Send,
  Ship,
  ShoppingBag,
  Smartphone,
  UserPlus,
  ShoppingCart,
  Warehouse,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

export default function HomePage(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('home');
  const tc = useTranslations('common');

  return (
    <>
      <HeroSection locale={locale} />
      <ActionsSection locale={locale} />
      <HowSection locale={locale} />
      <StepsSection />
      <StatsSection />
      <AppSection />
      <FaqSection />
      <FinalCtaSection locale={locale} />
    </>
  );

  function HeroSection({ locale }: { locale: string }): JSX.Element {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [, startTransition] = useTransition();

    function onSubmit(e: React.FormEvent): void {
      e.preventDefault();
      const trimmed = code.trim();
      if (!trimmed) return;
      startTransition(() => {
        router.push(`/${locale}/track?code=${encodeURIComponent(trimmed)}`);
      });
    }

    return (
      <section className="relative overflow-hidden bg-brand-navy text-white">
        {/* Diagonal red accent on the right edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block"
          style={{
            background:
              'linear-gradient(115deg, transparent 0%, transparent 38%, hsl(var(--brand-red)) 38%, hsl(var(--brand-red)) 62%, transparent 62%, transparent 100%)',
            opacity: 0.95,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block"
          style={{
            background:
              'linear-gradient(115deg, transparent 0%, transparent 60%, hsl(var(--brand-navy) / 0.6) 60%, hsl(var(--brand-navy) / 0.6) 80%, transparent 80%, transparent 100%)',
          }}
        />

        <div className="container relative grid gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24 lg:py-28">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/20">
              <Plane className="h-3.5 w-3.5" />
              {t('hero.eyebrow')}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-md text-base text-white/80 sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <form
              onSubmit={onSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              role="search"
              aria-label={t('hero.search')}
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/60"
                  aria-hidden
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('hero.placeholder')}
                  className="h-14 w-full rounded-xl border-2 border-white/0 bg-white pl-12 pr-4 text-base text-brand-navy shadow-lg outline-none placeholder:text-brand-navy/40 focus:border-brand-red"
                  aria-label={t('hero.title')}
                />
              </div>
              <Button
                type="submit"
                className="h-14 rounded-xl bg-brand-red px-8 text-base font-semibold text-white shadow-lg hover:bg-brand-red/90"
              >
                {t('hero.search')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={`/${locale}/register`}>
                <Button
                  variant="outline"
                  className="h-11 border-white/30 bg-white/0 text-white hover:bg-white/10"
                >
                  {t('hero.ctaPrimary')}
                </Button>
              </Link>
              <Link
                href={`/${locale}/login`}
                className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                {t('hero.ctaSecondary')} →
              </Link>
            </div>
          </div>

          {/* Right-side decorative card */}
          <div className="relative hidden md:block">
            <div className="absolute right-0 top-1/2 w-full max-w-sm -translate-y-1/2">
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                <div className="brand-stripe-top h-3" />
                <div className="space-y-4 p-6 text-brand-navy">
                  <div className="flex items-center justify-between">
                    <Logo size="md" />
                    <span className="rounded-full bg-brand-red/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-red">
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    <HeroTrack
                      icon={<Plane className="h-4 w-4" />}
                      tone="navy"
                      title="PG-204318"
                      subtitle="Miami → Port-au-Prince"
                      status="In transit"
                    />
                    <HeroTrack
                      icon={<Ship className="h-4 w-4" />}
                      tone="red"
                      title="PG-204210"
                      subtitle="Miami → Cap-Haïtien"
                      status="At customs"
                    />
                    <HeroTrack
                      icon={<MapPin className="h-4 w-4" />}
                      tone="amber"
                      title="PG-204147"
                      subtitle="Les Cayes branch"
                      status="Ready for pickup"
                    />
                  </div>
                </div>
                <div className="brand-stripe-bottom h-3" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function ActionsSection({ locale }: { locale: string }): JSX.Element {
    const items = [
      {
        href: `/${locale}/register`,
        icon: <Send className="h-6 w-6" />,
        title: t('actions.send.title'),
        desc: t('actions.send.desc'),
        cta: t('actions.send.cta'),
        tone: 'navy' as const,
      },
      {
        href: `/${locale}/register`,
        icon: <ShoppingBag className="h-6 w-6" />,
        title: t('actions.shop.title'),
        desc: t('actions.shop.desc'),
        cta: t('actions.shop.cta'),
        tone: 'red' as const,
      },
      {
        href: `/${locale}/addresses`,
        icon: <MapPin className="h-6 w-6" />,
        title: t('actions.addresses.title'),
        desc: t('actions.addresses.desc'),
        cta: t('actions.addresses.cta'),
        tone: 'navy' as const,
      },
      {
        href: `/${locale}/calculator`,
        icon: <Calculator className="h-6 w-6" />,
        title: t('actions.calculator.title'),
        desc: t('actions.calculator.desc'),
        cta: t('actions.calculator.cta'),
        tone: 'amber' as const,
      },
    ];

    return (
      <section className="container -mt-12 grid gap-5 pb-12 md:grid-cols-2 lg:grid-cols-4 lg:-mt-16">
        {items.map((item) => (
          <ActionCard key={item.title} {...item} />
        ))}
      </section>
    );
  }

  function HowSection({ locale }: { locale: string }): JSX.Element {
    return (
      <section className="border-y bg-white py-16 lg:py-20">
        <div className="container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 -z-10 rounded-3xl bg-brand-red/10" />
            <div className="overflow-hidden rounded-2xl bg-brand-navy text-white shadow-xl">
              <div className="brand-stripe-top h-12" />
              <div className="space-y-5 px-6 py-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red">
                    <Plane className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60">
                      Air freight
                    </p>
                    <p className="text-lg font-bold">4–7 days</p>
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Ship className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60">
                      Sea freight
                    </p>
                    <p className="text-lg font-bold">3–4 weeks</p>
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/60">
                      Pickup branches
                    </p>
                    <p className="text-lg font-bold">PAP · CAP · LCY</p>
                  </div>
                </div>
              </div>
              <div className="brand-stripe-bottom h-12" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
              {t('how.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              {t('how.title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t('how.p1')}
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {t('how.p2')}
            </p>
            <div className="mt-6">
              <Link href={`/${locale}/register`}>
                <Button className="h-12 bg-brand-red px-6 text-base font-semibold text-white hover:bg-brand-red/90">
                  {t('how.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function StepsSection(): JSX.Element {
    const steps = [
      {
        n: 1,
        icon: <UserPlus className="h-6 w-6" />,
        title: t('steps.s1.title'),
        desc: t('steps.s1.desc'),
      },
      {
        n: 2,
        icon: <ShoppingCart className="h-6 w-6" />,
        title: t('steps.s2.title'),
        desc: t('steps.s2.desc'),
      },
      {
        n: 3,
        icon: <Warehouse className="h-6 w-6" />,
        title: t('steps.s3.title'),
        desc: t('steps.s3.desc'),
      },
      {
        n: 4,
        icon: <PackageCheck className="h-6 w-6" />,
        title: t('steps.s4.title'),
        desc: t('steps.s4.desc'),
      },
    ];
    return (
      <section className="container py-16">
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
          {t('steps.title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Step key={s.n} {...s} />
          ))}
        </div>
      </section>
    );
  }

  function StatsSection(): JSX.Element {
    const items = [
      {
        value: t('stats.branchesValue'),
        label: t('stats.branchesLabel'),
        desc: t('stats.branchesDesc'),
      },
      {
        value: t('stats.languagesValue'),
        label: t('stats.languagesLabel'),
        desc: t('stats.languagesDesc'),
      },
      {
        value: t('stats.servicesValue'),
        label: t('stats.servicesLabel'),
        desc: t('stats.servicesDesc'),
      },
      {
        value: t('stats.trackingValue'),
        label: t('stats.trackingLabel'),
        desc: t('stats.trackingDesc'),
      },
    ];
    return (
      <section className="relative overflow-hidden bg-brand-navy py-16 text-white lg:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(circle at 80% 20%, hsl(var(--brand-red)) 0%, transparent 45%), radial-gradient(circle at 10% 80%, hsl(var(--brand-gold)) 0%, transparent 35%)',
          }}
        />
        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
              {t('stats.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t('stats.title')}
            </h2>
            <p className="mt-3 text-base text-white/70">
              {t('stats.subtitle')}
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <p className="text-4xl font-extrabold leading-none text-white sm:text-5xl">
                  {s.value}
                </p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-brand-red">
                  {s.label}
                </p>
                <p className="mt-2 text-sm text-white/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function AppSection(): JSX.Element {
    return (
      <section className="container py-16 lg:py-20">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-border">
          <div className="grid gap-10 p-8 md:grid-cols-2 md:p-12 md:items-center">
            <div>
              <Smartphone className="h-10 w-10 text-brand-red" />
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                {t('app.title')}
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                {t('app.desc')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <StoreBadge name={t('app.googlePlay')} hint={t('app.comingSoon')} />
                <StoreBadge name={t('app.appStore')} hint={t('app.comingSoon')} />
              </div>
            </div>
            <div className="relative mx-auto flex h-72 w-full max-w-sm items-center justify-center md:h-80">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-navy to-brand-red opacity-90" />
              <div className="relative h-full w-44 rounded-[2rem] border-[10px] border-brand-navy bg-brand-navy shadow-2xl">
                <div className="m-2 flex h-[calc(100%-1rem)] flex-col items-center justify-center rounded-[1.4rem] bg-white p-4 text-center text-brand-navy">
                  <Logo size="md" />
                  <p className="mt-4 text-[10px] uppercase tracking-widest text-brand-red">
                    Tracking
                  </p>
                  <p className="font-mono text-base font-bold">PG-204318</p>
                  <div className="mt-3 h-1 w-24 rounded-full bg-border">
                    <div className="h-1 w-2/3 rounded-full bg-brand-red" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">In transit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function FaqSection(): JSX.Element {
    const items = [
      { q: t('faq.q1'), a: t('faq.a1') },
      { q: t('faq.q2'), a: t('faq.a2') },
      { q: t('faq.q3'), a: t('faq.a3') },
      { q: t('faq.q4'), a: t('faq.a4') },
      { q: t('faq.q5'), a: t('faq.a5') },
      { q: t('faq.q6'), a: t('faq.a6') },
    ];
    const [open, setOpen] = useState<number | null>(0);

    return (
      <section className="border-t bg-secondary/40 py-16 lg:py-20">
        <div className="container max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
              {t('faq.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              {t('faq.title')}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              {t('faq.subtitle')}
            </p>
          </div>
          <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-start gap-4 px-6 py-5 text-left transition-colors hover:bg-secondary/50"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold',
                      isOpen
                        ? 'bg-brand-red text-white'
                        : 'bg-brand-navy/10 text-brand-navy',
                    )}
                  >
                    {String(i + 1).padStart(2, '0').slice(-2)}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-base font-semibold text-brand-navy">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 flex-none text-brand-navy transition-transform',
                          isOpen && 'rotate-180 text-brand-red',
                        )}
                      />
                    </span>
                    {isOpen && (
                      <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function FinalCtaSection({ locale }: { locale: string }): JSX.Element {
    return (
      <section className="container py-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-10 text-center text-white shadow-xl md:p-14">
          <div className="brand-stripe-top absolute inset-x-0 top-0 h-3" />
          <div className="brand-stripe-bottom absolute inset-x-0 bottom-0 h-3" />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/80">
            {t('cta.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/register`}>
              <Button className="h-12 bg-brand-red px-8 text-base font-semibold text-white hover:bg-brand-red/90">
                {t('cta.button')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/calculator`}>
              <Button
                variant="outline"
                className="h-12 border-white/30 bg-white/0 px-6 text-white hover:bg-white/10"
              >
                {tc('continue')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }
}

function HeroTrack({
  icon,
  title,
  subtitle,
  status,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: string;
  tone: 'navy' | 'red' | 'amber';
}): JSX.Element {
  const toneBg =
    tone === 'red'
      ? 'bg-brand-red'
      : tone === 'amber'
        ? 'bg-amber-500'
        : 'bg-brand-navy';
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
      <div
        className={cn(
          'flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white',
          toneBg,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-bold text-brand-navy">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red ring-1 ring-brand-red/30">
        {status}
      </span>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
  cta,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  tone: 'navy' | 'red' | 'amber';
}): JSX.Element {
  const accent =
    tone === 'red'
      ? 'bg-brand-red text-white'
      : tone === 'amber'
        ? 'bg-amber-500 text-white'
        : 'bg-brand-navy text-white';
  const ring =
    tone === 'red'
      ? 'group-hover:ring-brand-red/40'
      : tone === 'amber'
        ? 'group-hover:ring-amber-500/40'
        : 'group-hover:ring-brand-navy/40';
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-2xl bg-white p-6 shadow-md ring-1 ring-border transition-all hover:-translate-y-1 hover:shadow-xl',
        ring,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          accent,
        )}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-navy">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-red transition-transform group-hover:translate-x-0.5">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg">
          {icon}
        </div>
        <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-brand-red text-xs font-extrabold text-white">
          {n}
        </span>
      </div>
      <h3 className="mt-4 text-base font-bold text-brand-navy">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function StoreBadge({
  name,
  hint,
}: {
  name: string;
  hint: string;
}): JSX.Element {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-brand-navy px-4 py-2.5 text-white">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-widest text-white/60">
          {hint}
        </p>
        <p className="text-sm font-bold">{name}</p>
      </div>
    </div>
  );
}
