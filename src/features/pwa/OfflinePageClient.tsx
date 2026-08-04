'use client';

import { useSyncExternalStore } from 'react';
import en from '../../../messages/en/pwa.json';
import vi from '../../../messages/vi/pwa.json';
import ja from '../../../messages/ja/pwa.json';
import { DEFAULT_LOCALE } from '@/lib/i18n/constants';
import { resolveClientLocale } from '@/lib/i18n/client-locale';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const PWA_COPY = {
  en: en.pwa,
  vi: vi.pwa,
  ja: ja.pwa,
} as const;

function subscribeLocale() {
  return () => undefined;
}

export function OfflinePageClient() {
  const providerLocale = useLocale();
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => resolveClientLocale(providerLocale || DEFAULT_LOCALE),
    () => providerLocale || DEFAULT_LOCALE
  );
  const copy = PWA_COPY[locale];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {copy.offlineTitle}
        </h1>
        <p className="text-muted-foreground leading-relaxed">{copy.offlineBody}</p>
        <p className="text-sm text-muted-foreground">{copy.studyNeedsNetwork}</p>
        <p className="text-sm text-muted-foreground">{copy.offlinePrerequisite}</p>
        <p className="text-sm text-muted-foreground">{copy.installIosHint}</p>
      </div>
      <div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={() => {
            window.location.reload();
          }}
        >
          {copy.reload}
        </button>
      </div>
    </main>
  );
}
