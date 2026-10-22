import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from '@/config/security-headers';
import { REQUIRED_WORKER_SRC_CSP } from '@/features/pwa/sw-policy';
import {
  HANZI_WRITER_DATA_BASE_URL,
  hanziCharDataUrl,
  loadHanziCharData,
} from '@/features/study/lib/draw-config';

function directive(name: string): string[] {
  const entry = CONTENT_SECURITY_POLICY.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  return entry ? entry.split(/\s+/).slice(1) : [];
}

/** Minimal CSP host-source match: a source ending in "/" matches any path under it. */
function connectSrcAllows(url: string): boolean {
  return directive('connect-src').some((source) => {
    if (source === "'self'") return false;
    if (source.includes('*')) {
      const host = new URL(url).host;
      return host.endsWith(source.replace('https://*', ''));
    }
    return source.endsWith('/') ? url.startsWith(source) : url === source;
  });
}

describe('Content-Security-Policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows Draw mode to fetch hanzi-writer stroke data', () => {
    expect(HANZI_WRITER_DATA_BASE_URL.endsWith('/')).toBe(true);
    expect(connectSrcAllows(hanziCharDataUrl('大'))).toBe(true);
  });

  it('does not open connect-src to the whole CDN', () => {
    expect(directive('connect-src')).not.toContain('https://cdn.jsdelivr.net');
    expect(connectSrcAllows('https://cdn.jsdelivr.net/npm/other-package/x.json')).toBe(false);
  });

  it('keeps the service worker directive', () => {
    expect(CONTENT_SECURITY_POLICY).toContain(REQUIRED_WORKER_SRC_CSP);
    expect(SECURITY_HEADERS.find((h) => h.key === 'Content-Security-Policy')?.value).toBe(
      CONTENT_SECURITY_POLICY
    );
  });

  it('the hanzi-writer loader fetches only the allowlisted URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ strokes: [], medians: [] }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);
    const onLoad = vi.fn();
    const onError = vi.fn();

    loadHanziCharData('大', onLoad, onError);
    await vi.waitFor(() => expect(onLoad).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(hanziCharDataUrl('大'));
    expect(connectSrcAllows(fetchMock.mock.calls[0]?.[0] as string)).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('the hanzi-writer loader reports missing characters as errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const onError = vi.fn();

    loadHanziCharData('𠀀', vi.fn(), onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
