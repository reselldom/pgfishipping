import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function CalculatorPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('nav');
  return (
    <div className="container max-w-2xl py-16 text-center">
      <h1 className="text-3xl font-bold">{t('calculator')}</h1>
      <p className="mt-3 text-muted-foreground">
        Calculator wizard is coming in Phase 12.
      </p>
    </div>
  );
}
