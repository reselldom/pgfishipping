import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('about');
  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
      <p className="text-lg text-muted-foreground">{t('intro')}</p>

      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-semibold">{t('missionTitle')}</h2>
          <p className="text-muted-foreground">{t('mission')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="text-xl font-semibold">{t('valuesTitle')}</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>{t('v1')}</li>
            <li>{t('v2')}</li>
            <li>{t('v3')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
