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

type WaitingWorkerHost = {
  addEventListener(type: 'controlling', listener: () => void): void;
  messageSkipWaiting(): void;
};

/** If the new worker never takes control (e.g. another tab), reload anyway after this. */
export const ACTIVATE_RELOAD_FALLBACK_MS = 4_000;

/**
 * Activates the waiting worker and reloads once it controls the page. Reloading right
 * after `messageSkipWaiting()` races the activation: the reload can still be served by
 * the old worker and mix old and new chunks.
 */
export function activateWaitingWorker(
  serwist: WaitingWorkerHost,
  reload: () => void = () => window.location.reload(),
  schedule: (fn: () => void, ms: number) => unknown = setTimeout
): void {
  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    reload();
  };
  serwist.addEventListener('controlling', reloadOnce);
  serwist.messageSkipWaiting();
  schedule(reloadOnce, ACTIVATE_RELOAD_FALLBACK_MS);
}
