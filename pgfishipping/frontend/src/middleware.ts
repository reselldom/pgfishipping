import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  // First-time visitors land on Kreyòl regardless of browser Accept-Language.
  // The footer language switcher (and the cookie next-intl writes when they
  // pick a different one) still let them choose their own preferred locale.
  localeDetection: false,
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
