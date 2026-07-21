'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n/constants';
import { t, type CatalogMessages } from '@/lib/i18n/t';

type LocaleContextValue = {
  locale: Locale;
  catalog: CatalogMessages;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  locale: Locale;
  catalog: CatalogMessages;
  children: ReactNode;
};

export function LocaleProvider({ locale, catalog, children }: LocaleProviderProps) {
  const translate = useCallback(
    (key: string, interpolations?: Record<string, string | number>) =>
      t(catalog, key, interpolations),
    [catalog]
  );

  const value = useMemo(
    () => ({
      locale: locale || DEFAULT_LOCALE,
      catalog,
      t: translate,
    }),
    [locale, catalog, translate]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocaleContext must be used within LocaleProvider');
  }
  return ctx;
}

export function useTranslations() {
  return useLocaleContext().t;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}
