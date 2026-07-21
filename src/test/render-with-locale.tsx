import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { loadCatalog } from '@/lib/i18n/catalog';
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n/constants';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

type Options = Omit<RenderOptions, 'wrapper'> & {
  locale?: Locale;
};

export function renderWithLocale(ui: ReactElement, options: Options = {}) {
  const { locale = DEFAULT_LOCALE, ...renderOptions } = options;
  const catalog = loadCatalog(locale);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider locale={locale} catalog={catalog}>
        {children}
      </LocaleProvider>
    );
  }

  return render(ui, { ...renderOptions, wrapper: Wrapper });
}
