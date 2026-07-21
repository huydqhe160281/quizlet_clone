import { beforeEach, describe, expect, it, vi } from 'vitest';

const optionalUserIdMock = vi.hoisted(() => vi.fn());
const getCachedSearchPublicSetsMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth/auth-utils', () => ({
  optionalUserId: optionalUserIdMock,
}));

vi.mock('@/server/services/search.service', () => ({
  getCachedSearchPublicSets: getCachedSearchPublicSetsMock,
}));

import { GET } from '@/app/api/v1/search/route';

describe('GET /api/v1/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optionalUserIdMock.mockResolvedValue(null);
    getCachedSearchPublicSetsMock.mockResolvedValue({
      data: [],
      pagination: { nextCursor: null, hasMore: false },
    });
  });

  it('passes opaque cursor and optional user id through to service', async () => {
    const cursor = Buffer.from(
      JSON.stringify({
        v: 1,
        kind: 'search',
        rank: 0.42,
        createdAt: '2026-07-21T00:00:00.000Z',
        id: 'set-1',
      }),
      'utf8'
    ).toString('base64url');
    optionalUserIdMock.mockResolvedValue('user-1');

    const req = new Request(`http://localhost/api/v1/search?q=english&cursor=${cursor}&limit=10`);
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    expect(getCachedSearchPublicSetsMock).toHaveBeenCalledWith(
      { q: 'english', cursor, limit: 10 },
      'user-1'
    );
  });

  it('returns 400 when q is missing', async () => {
    const req = new Request('http://localhost/api/v1/search?cursor=abc');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});
