export type Locale = 'vi' | 'en' | 'ja';

export const SUPPORTED_LOCALES = ['vi', 'en', 'ja'] as const;

export const DEFAULT_LOCALE: Locale = 'vi';

export const APP_LOCALE_COOKIE = 'app-locale';

export const ACCEPT_LANGUAGE_MAP: Record<string, Locale> = {
  vi: 'vi',
  'vi-VN': 'vi',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  ja: 'ja',
  'ja-JP': 'ja',
};

export const OG_LOCALE_MAP: Record<Locale, string> = {
  vi: 'vi_VN',
  en: 'en_US',
  ja: 'ja_JP',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
