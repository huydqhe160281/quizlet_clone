import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCachedPublicLibraryMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/search.service', () => ({
  getCachedPublicLibrary: getCachedPublicLibraryMock,
}));

import { GET } from '@/app/api/v1/library/route';

describe('GET /api/v1/library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedPublicLibraryMock.mockResolvedValue({
      data: [],
      pagination: { nextCursor: null, hasMore: false },
    });
  });

  it('passes opaque cursor through to service', async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        v: 1,
        kind: 'trending',
        studyCount: 10,
        lastStartedAt: '2026-07-21T00:00:00.000Z',
        id: 'set-1',
      }),
      'utf8'
    ).toString('base64url');
    const req = new Request(
      `http://localhost/api/v1/library?sort=trending&cursor=${cursor}&limit=20`
    );

    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    expect(getCachedPublicLibraryMock).toHaveBeenCalledWith({
      sort: 'trending',
      cursor,
      limit: 20,
    });
  });

  it('returns 400 for invalid empty cursor', async () => {
    const req = new Request('http://localhost/api/v1/library?sort=newest&cursor=');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});
