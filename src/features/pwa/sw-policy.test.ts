import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_STRATEGY,
  NAVIGATE_FALLBACK_DENYLIST,
  OFFLINE_FALLBACK_PATH,
  REQUIRED_WORKER_SRC_CSP,
  cspIncludesWorkerSrc,
  isNavigateFallbackDenied,
  mayPersistInCacheStorage,
  resolveRuntimeStrategy,
  shouldRegisterServiceWorker,
} from '@/features/pwa/sw-policy';

describe('PWA SW policy', () => {
  it('Scenario: Document strategy is NetworkOnly + /offline.html (not NetworkFirst)', () => {
    expect(DOCUMENT_STRATEGY).toBe('NetworkOnly');
    expect(OFFLINE_FALLBACK_PATH).toBe('/offline.html');
    expect(DOCUMENT_STRATEGY).not.toBe('NetworkFirst');
  });

  it('Scenario: API bypasses SW cache', () => {
    expect(resolveRuntimeStrategy('/api/v1/today')).toBe('NetworkOnly');
    expect(mayPersistInCacheStorage('/api/v1/today')).toBe(false);
    expect(mayPersistInCacheStorage('/api/auth/session')).toBe(false);
  });

  it('Scenario: RSC flight bypasses SW cache', () => {
    expect(resolveRuntimeStrategy('/_next/data/build/x.json')).toBe('NetworkOnly');
    expect(mayPersistInCacheStorage('/_next/webpack-hmr')).toBe(false);
  });

  it('Scenario: Static chunks cache-first', () => {
    expect(resolveRuntimeStrategy('/_next/static/chunks/app.js')).toBe('CacheFirst');
    expect(mayPersistInCacheStorage('/_next/static/chunks/app.js')).toBe(true);
  });

  it('Scenario: Stale document not served offline', () => {
    expect(mayPersistInCacheStorage('/today')).toBe(false);
    expect(mayPersistInCacheStorage('/dashboard')).toBe(false);
    expect(mayPersistInCacheStorage(OFFLINE_FALLBACK_PATH)).toBe(true);
  });

  it('Scenario: navigateFallback denylist excludes API and RSC paths', () => {
    expect(NAVIGATE_FALLBACK_DENYLIST.length).toBeGreaterThan(0);
    expect(isNavigateFallbackDenied('/api/v1/today')).toBe(true);
    expect(isNavigateFallbackDenied('/_next/static/x.js')).toBe(true);
    expect(isNavigateFallbackDenied('/today')).toBe(false);
    expect(isNavigateFallbackDenied('/offline')).toBe(false);
  });

  it('Scenario: Session auth responses not persisted in Cache Storage', () => {
    expect(mayPersistInCacheStorage('/api/auth/callback/google')).toBe(false);
    expect(mayPersistInCacheStorage('/api/auth/session')).toBe(false);
  });

  it('Scenario: Dev does not register by default', () => {
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'development',
        isSecureContext: true,
      })
    ).toBe(false);
  });

  it('Scenario: Insecure context skips registration', () => {
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'production',
        isSecureContext: false,
      })
    ).toBe(false);
  });

  it('Scenario: Production registers SW', () => {
    expect(
      shouldRegisterServiceWorker({
        nodeEnv: 'production',
        isSecureContext: true,
      })
    ).toBe(true);
  });

  it('Scenario: CSP allows service worker registration', () => {
    expect(REQUIRED_WORKER_SRC_CSP).toContain("worker-src 'self'");
    const header = ["default-src 'self'", "script-src 'self'", REQUIRED_WORKER_SRC_CSP].join('; ');
    expect(cspIncludesWorkerSrc(header)).toBe(true);
    expect(cspIncludesWorkerSrc("default-src 'self'")).toBe(false);
  });
});
