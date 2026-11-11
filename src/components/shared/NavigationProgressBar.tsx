'use client';

import { useTranslations } from '@/lib/i18n/LocaleProvider';

/** Thin non-blocking top bar shown while a client navigation is pending. */
export function NavigationProgressBar({ visible }: { visible: boolean }) {
  const t = useTranslations();

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden"
      role="progressbar"
      aria-busy="true"
      aria-label={t('ui.loading')}
    >
      <div className="nav-progress-bar h-full w-2/5 rounded-full bg-primary" />
    </div>
  );
}
