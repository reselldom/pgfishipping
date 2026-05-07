import { setRequestLocale } from 'next-intl/server';
import { fetchPublicFooterContent } from '@/lib/public-api';
import { SupportPageClient } from './support-page-client';

export const dynamic = 'force-dynamic';

export default async function SupportPage({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<JSX.Element> {
  setRequestLocale(locale);
  const footer = await fetchPublicFooterContent();
  return (
    <SupportPageClient
      footerEmail={footer.email}
      footerPhones={footer.phones}
    />
  );
}
