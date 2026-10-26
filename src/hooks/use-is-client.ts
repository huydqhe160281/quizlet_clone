import { useSyncExternalStore } from 'react';

const subscribeNoop = () => () => {};

/**
 * False during SSR and hydration, true afterwards. Use it to gate output that depends on
 * client-only state (e.g. the next-themes theme) so the first client render matches the HTML.
 */
export function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}
