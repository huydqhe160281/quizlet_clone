import { type Locale, DEFAULT_LOCALE, ACCEPT_LANGUAGE_MAP, isLocale } from './constants';

type ResolveLocaleInput = {
  dbLocale?: Locale | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
};

export function resolveLocale(input: ResolveLocaleInput): Locale {
  if (isLocale(input.dbLocale)) return input.dbLocale;
  if (isLocale(input.cookieLocale)) return input.cookieLocale;

  const accepted = input.acceptLanguage;
  if (accepted) {
    const entries = accepted
      .split(',')
      .map((entry) => {
        const [rawTag, rawQ = '1'] = entry.trim().split(';q=');
        const tag = rawTag.trim();
        const q = parseFloat(rawQ.trim()) || 0;
        let mapped: Locale | null = null;
        if (ACCEPT_LANGUAGE_MAP[tag]) mapped = ACCEPT_LANGUAGE_MAP[tag];
        else if (/^vi/i.test(tag)) mapped = 'vi';
        else if (/^en/i.test(tag)) mapped = 'en';
        else if (/^ja/i.test(tag)) mapped = 'ja';
        return { tag, q, locale: mapped };
      })
      .filter((entry): entry is { tag: string; q: number; locale: Locale } => !!entry.locale)
      .sort((a, b) => b.q - a.q);

    if (entries.length > 0) return entries[0].locale;
  }

  return DEFAULT_LOCALE;
}
