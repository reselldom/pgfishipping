import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function TermsPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('terms');
  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-red">
          PGFI Shipping
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-pg-navy sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-pg-muted">{t('updated')}</p>
      </div>
      <p className="text-pg-ink">{t('p1')}</p>
      <Section title={t('h1')} body={t('p2')} />
      <Section title={t('h2')} body={t('p3')} />
      <Section title={t('h3')} body={t('p4')} />
      <Section title={t('h4')} body={t('p5')} />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <section className="space-y-2 border-l-4 border-pg-red/30 pl-4">
      <h2 className="text-xl font-bold text-pg-navy">{title}</h2>
      <p className="text-pg-ink">{body}</p>
    </section>
  );
}
