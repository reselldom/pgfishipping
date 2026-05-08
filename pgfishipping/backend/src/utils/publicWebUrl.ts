import type { Language } from '@prisma/client';
import { env } from '../config/env';

const LANGUAGE_TO_PATH: Record<Language, string> = {
  EN: 'en',
  FR: 'fr',
  HT: 'ht',
  ES: 'es',
};

function appOrigin(): string {
  return env.APP_URL.replace(/\/+$/, '');
}

function localePathSegment(language?: Language | null): string {
  if (language && LANGUAGE_TO_PATH[language]) return LANGUAGE_TO_PATH[language];
  const d = env.PUBLIC_WEB_DEFAULT_LOCALE.trim().toLowerCase();
  return d || 'ht';
}

/** Full URL matching Next.js `[locale]` prefix (e.g. `/ht/track/PG-...`). */
export function publicWebUrl(
  pathname: string,
  language?: Language | null,
): string {
  const base = appOrigin();
  const loc = localePathSegment(language);
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}/${loc}${path}`;
}

/** Locale home (for generic “visit site” links). */
export function publicWebLocaleRoot(language?: Language | null): string {
  return `${appOrigin()}/${localePathSegment(language)}`;
}
