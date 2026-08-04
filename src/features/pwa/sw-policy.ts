/**
 * PWA Phase 1 — pure policy SSOT (testable without Serwist runtime).
 * Documents: NetworkOnly + /offline fallback (never NetworkFirst HTML).
 */

/** Static shell (cookie-aware). Do not precache App Router `/offline` HTML. */
export const OFFLINE_FALLBACK_PATH = '/offline.html';

export const DOCUMENT_STRATEGY = 'NetworkOnly' as const;

/** Paths that must never be rewritten to the offline HTML document. */
export const NAVIGATE_FALLBACK_DENYLIST: readonly RegExp[] = [/^\/api\//, /^\/_next\//];

export type CacheStrategyName = 'CacheFirst' | 'NetworkOnly';

export type RuntimeCacheRule = {
  id: string;
  strategy: CacheStrategyName;
  /** Return true if this rule owns the request. */
  match: (pathname: string, destination?: string) => boolean;
};

export const RUNTIME_CACHE_RULES: readonly RuntimeCacheRule[] = [
  {
    id: 'next-static',
    strategy: 'CacheFirst',
    match: (pathname) => pathname.startsWith('/_next/static/'),
  },
  {
    id: 'api-network-only',
    strategy: 'NetworkOnly',
    match: (pathname) => pathname.startsWith('/api/'),
  },
  {
    id: 'next-non-static-network-only',
    strategy: 'NetworkOnly',
    match: (pathname) => pathname.startsWith('/_next/') && !pathname.startsWith('/_next/static/'),
  },
];

export function isNavigateFallbackDenied(pathname: string): boolean {
  return NAVIGATE_FALLBACK_DENYLIST.some((re) => re.test(pathname));
}

/** Resolve which runtime strategy applies (first match wins). */
export function resolveRuntimeStrategy(
  pathname: string,
  destination?: string
): CacheStrategyName | null {
  void destination;
  for (const rule of RUNTIME_CACHE_RULES) {
    if (rule.match(pathname)) {
      return rule.strategy;
    }
  }
  return null;
}

/**
 * Auth/API responses must never be written to Cache Storage.
 * Used by config tests and SW review gates.
 */
export function mayPersistInCacheStorage(pathname: string): boolean {
  if (pathname === OFFLINE_FALLBACK_PATH) return true;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/') && !pathname.startsWith('/_next/static/')) {
    return false;
  }
  // Document HTML for app routes — not persisted (NetworkOnly + fallback).
  if (!pathname.startsWith('/_next/static/') && !pathname.includes('.')) {
    return false;
  }
  return pathname.startsWith('/_next/static/');
}

export function shouldRegisterServiceWorker(env: {
  nodeEnv: string;
  pwaDevFlag?: string;
  isSecureContext: boolean;
}): boolean {
  if (!env.isSecureContext) return false;
  if (env.nodeEnv === 'production') return true;
  return env.pwaDevFlag === '1';
}

/** CSP directive required so Serwist SW is not blocked. */
export const REQUIRED_WORKER_SRC_CSP = "worker-src 'self'";

export function cspIncludesWorkerSrc(cspHeaderValue: string): boolean {
  return /worker-src\s+'self'/.test(cspHeaderValue);
}
