import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Building2, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AddressesPage({
  params: { locale },
}: {
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(locale);
  const t = useTranslations('addresses');
  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            {t('format')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-secondary/30 p-4 font-mono text-sm leading-relaxed">
            <div>{t('fmtName')} — <span className="text-primary">ARI-001234</span></div>
            <div>{t('miamiAddress')}</div>
            <div>{t('fmtCountry')}</div>
          </div>
          <div className="mt-3 flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <span>{t('tip')}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-primary" />
            {t('warehouses')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-semibold">{t('miami')}</div>
            <div className="text-muted-foreground">{t('miamiAddress')}</div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href={`/${locale}/register`}>
          <Button size="lg">{t('ctaSignup')}</Button>
        </Link>
      </div>
    </div>
  );
}
