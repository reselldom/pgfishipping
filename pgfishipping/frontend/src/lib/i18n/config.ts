export const locales = ['ht', 'en', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];
// Kreyòl is the primary language of our customer base, so we default to it
// and let visitors switch from the footer.
export const defaultLocale: Locale = 'ht';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ht: 'Kreyòl',
  es: 'Español',
};

// Twemoji-friendly regional indicator flags. We deliberately use 🇭🇹 for
// Kreyòl (Haitian Creole is spoken in Haiti) and 🇺🇸 for English.
export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  ht: '🇭🇹',
  es: '🇪🇸',
};
