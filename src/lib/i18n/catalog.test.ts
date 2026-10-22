import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCatalog } from '@/lib/i18n/catalog';

describe('loadCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads each locale once per process in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const first = loadCatalog('en');
    expect(loadCatalog('en')).toBe(first);
    expect(loadCatalog('ja')).not.toBe(first);
  });

  it('re-reads catalogs in development so message edits show up', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const first = loadCatalog('en');
    const second = loadCatalog('en');
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it('falls back to the default locale for an unknown locale', () => {
    expect(loadCatalog('xx')).toEqual(loadCatalog('vi'));
  });
});
