import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('privacy');
  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('updated')}</p>
      </div>
      <p className="text-muted-foreground">{t('p1')}</p>
      <Section title={t('h1')} body={t('p2')} />
      <Section title={t('h2')} body={t('p3')} />
      <Section title={t('h3')} body={t('p4')} />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{body}</p>
    </section>
  );
}
