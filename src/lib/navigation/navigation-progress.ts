/** Fired to show the top navigation progress bar for a programmatic navigation. */
export const NAVIGATION_START_EVENT = 'app:navigation-start';

/**
 * Shows the progress bar for a `router.push` / `router.replace` to `href`. Link clicks
 * are detected on their own; this covers navigations started from code. A target equal
 * to the current URL never commits a new route, so it is ignored instead of leaving the
 * bar up until its timeout.
 */
export function startNavigationProgress(href: string): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (`${url.pathname}${url.search}` === current) return;
  } catch {
    return;
  }
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
