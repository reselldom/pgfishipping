'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, localeLabels, type Locale } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSwitcher(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale();

  function onChange(next: Locale): void {
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        aria-label="Language"
        className="h-9 cursor-pointer appearance-none rounded-md border border-input bg-background px-2 pr-6 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={current}
        onChange={(e) => onChange(e.target.value as Locale)}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
