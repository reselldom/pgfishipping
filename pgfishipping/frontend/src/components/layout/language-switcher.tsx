'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeFlags, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale() as Locale;
  const tc = useTranslations('common');

  function buildHref(next: Locale): string {
    const segments = (pathname || '/').split('/');
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const joined = segments.join('/');
    return joined.length > 0 ? joined : `/${next}`;
  }

  function onSelect(next: Locale): void {
    if (next === current) return;
    router.push(buildHref(next));
  }

  function label(l: Locale): string {
    switch (l) {
      case 'en':
        return tc('lang.option_en');
      case 'fr':
        return tc('lang.option_fr');
      case 'ht':
        return tc('lang.option_ht');
      case 'es':
        return tc('lang.option_es');
      default:
        return l;
    }
  }

  return (
    <div
      role="group"
      aria-label={tc('lang.aria')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-slate-200/90 bg-slate-100/90 p-0.5',
        className,
      )}
    >
      {locales.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onSelect(l)}
            aria-pressed={active}
            aria-label={label(l)}
            title={label(l)}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[15px] leading-none transition-colors',
              active
                ? 'bg-white text-pg-navy shadow-sm ring-1 ring-pg-orange/40'
                : 'text-pg-navy/75 hover:bg-white/90 hover:text-pg-navy',
            )}
          >
            <span aria-hidden>{localeFlags[l]}</span>
          </button>
        );
      })}
    </div>
  );
}
