import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  MapPin,
  DollarSign,
  Truck,
  UserPlus,
  ShoppingCart,
  Warehouse,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('home');
  return (
    <>
      <section className="bg-gradient-to-br from-primary/5 to-background py-20">
        <div className="container max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href={`/${locale}/register`}>
              <Button size="lg">{t('hero.ctaPrimary')}</Button>
            </Link>
            <Link href={`/${locale}/track`}>
              <Button size="lg" variant="outline">
                {t('hero.ctaSecondary')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container grid gap-6 py-16 md:grid-cols-3">
        <FeatureCard
          icon={<MapPin className="h-8 w-8 text-primary" />}
          title={t('features.free.title')}
          description={t('features.free.desc')}
        />
        <FeatureCard
          icon={<DollarSign className="h-8 w-8 text-primary" />}
          title={t('features.transparent.title')}
          description={t('features.transparent.desc')}
        />
        <FeatureCard
          icon={<Truck className="h-8 w-8 text-primary" />}
          title={t('features.tracking.title')}
          description={t('features.tracking.desc')}
        />
      </section>

      <section className="border-t bg-secondary/30 py-16">
        <div className="container max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            {t('steps.title')}
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Step
              n={1}
              icon={<UserPlus className="h-6 w-6" />}
              title={t('steps.s1.title')}
              desc={t('steps.s1.desc')}
            />
            <Step
              n={2}
              icon={<ShoppingCart className="h-6 w-6" />}
              title={t('steps.s2.title')}
              desc={t('steps.s2.desc')}
            />
            <Step
              n={3}
              icon={<Warehouse className="h-6 w-6" />}
              title={t('steps.s3.title')}
              desc={t('steps.s3.desc')}
            />
            <Step
              n={4}
              icon={<PackageCheck className="h-6 w-6" />}
              title={t('steps.s4.title')}
              desc={t('steps.s4.desc')}
            />
          </div>
        </div>
      </section>

      <section className="container py-16">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('cta.title')}</h2>
            <p className="text-muted-foreground">{t('cta.subtitle')}</p>
            <Link href={`/${locale}/register`}>
              <Button size="lg">{t('cta.button')}</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-6">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {icon}
        </div>
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-foreground text-xs font-bold text-background">
          {n}
        </span>
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
