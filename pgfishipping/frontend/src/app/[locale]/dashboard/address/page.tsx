'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyAddress } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api';
import type { UsAddress } from '@/lib/types';

export default function MyAddressPage(): JSX.Element {
  const t = useTranslations('myAddress');
  const [data, setData] = useState<UsAddress | null>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<'air' | 'sea' | null>(null);

  useEffect(() => {
    getMyAddress()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  function copy(text: string, kind: 'air' | 'sea'): void {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!data) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AddressCard
          title={t('airTitle')}
          address={data.airAddress}
          copied={copied === 'air'}
          onCopy={() => copy(data.airAddress, 'air')}
          copyLabel={t('copy')}
          copiedLabel={t('copied')}
        />
        <AddressCard
          title={t('seaTitle')}
          address={data.seaAddress}
          copied={copied === 'sea'}
          onCopy={() => copy(data.seaAddress, 'sea')}
          copyLabel={t('copy')}
          copiedLabel={t('copied')}
        />
      </div>

      {data.warehouse ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {t('warehouse')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{data.warehouse.name}</p>
            <p className="text-muted-foreground">
              {data.warehouse.address}, {data.warehouse.city}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function AddressCard({
  title,
  address,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  title: string;
  address: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
}): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap rounded-md border bg-secondary/30 p-3 font-mono text-sm leading-relaxed">
          {address}
        </pre>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" /> {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" /> {copyLabel}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
