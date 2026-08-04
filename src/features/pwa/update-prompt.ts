/**
 * Pure helpers for update-toast UX (unit-tested without DOM Serwist).
 */

export function buildUpdateToastCopy(t: (key: string) => string): {
  title: string;
  warning: string;
  actionLabel: string;
} {
  return {
    title: t('pwa.updateAvailable'),
    warning: t('pwa.updateReloadWarning'),
    actionLabel: t('pwa.updateReload'),
  };
}

/** Spec: never auto-reload when a waiting worker appears. */
export function shouldAutoReloadOnWaiting(): boolean {
  return false;
}
