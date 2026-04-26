import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, DollarSign, Truck } from 'lucide-react';

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
