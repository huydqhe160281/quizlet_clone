import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  flashcardSet: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

vi.mock('next/cache', () => ({
  unstable_cache:
    <T>(fn: () => T | Promise<T>) =>
    () =>
      fn(),
}));

import { getPublicLibrary, searchPublicSets } from '@/server/services/search.service';

const encodeCursor = (payload: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

describe('search.service cursor pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid cursor kind for trending sort', async () => {
    const badCursor = encodeCursor({
      v: 1,
      kind: 'newest',
      createdAt: '2026-07-21T00:00:00.000Z',
      id: 'set-1',
    });

    await expect(
      getPublicLibrary({
        sort: 'trending',
        limit: 20,
        cursor: badCursor,
      })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('supports multi-page trending with opaque cursor', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        id: 'set-3',
        study_count: 20,
        last_started_at: new Date('2026-07-21T10:00:00.000Z'),
      },
      {
        id: 'set-2',
        study_count: 18,
        last_started_at: new Date('2026-07-21T09:00:00.000Z'),
      },
      {
        id: 'set-1',
        study_count: 17,
        last_started_at: new Date('2026-07-21T08:00:00.000Z'),
      },
    ]);
    prismaMock.flashcardSet.findMany.mockResolvedValue([
      {
        id: 'set-2',
        title: 'B',
        visibility: 'PUBLIC',
        _count: { studySessions: 18, cards: 10 },
        tags: [],
      },
      {
        id: 'set-3',
        title: 'A',
        visibility: 'PUBLIC',
        _count: { studySessions: 20, cards: 12 },
        tags: [],
      },
    ]);

    const firstPage = await getPublicLibrary({
      sort: 'trending',
      limit: 2,
    });

    expect(firstPage.data.map((set) => set.id)).toEqual(['set-3', 'set-2']);
    expect(firstPage.pagination.hasMore).toBe(true);
    expect(firstPage.pagination.nextCursor).toBeTruthy();

    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: 'set-1',
        study_count: 17,
        last_started_at: new Date('2026-07-21T08:00:00.000Z'),
      },
    ]);
    prismaMock.flashcardSet.findMany.mockResolvedValueOnce([
      {
        id: 'set-1',
        title: 'C',
        visibility: 'PUBLIC',
        _count: { studySessions: 17, cards: 8 },
        tags: [],
      },
    ]);

    const secondPage = await getPublicLibrary({
      sort: 'trending',
      limit: 2,
      cursor: firstPage.pagination.nextCursor ?? undefined,
    });

    expect(secondPage.data.map((set) => set.id)).toEqual(['set-1']);
    expect(secondPage.pagination.hasMore).toBe(false);
  });

  it('rejects malformed search cursor payload', async () => {
    const malformedCursor = encodeCursor({
      v: 1,
      kind: 'search',
      rank: 1.2,
      createdAt: 'not-a-date',
      id: 'set-1',
    });

    await expect(
      searchPublicSets({
        q: 'english',
        limit: 20,
        cursor: malformedCursor,
      })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('fails fast when ranking value is non-numeric', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { id: 'set-1', createdAt: new Date('2026-07-21T10:00:00.000Z'), rank: 'NaN' },
      { id: 'set-2', createdAt: new Date('2026-07-21T09:00:00.000Z'), rank: 'NaN' },
    ]);
    prismaMock.flashcardSet.findMany.mockResolvedValue([{ id: 'set-1' }, { id: 'set-2' }]);

    await expect(
      searchPublicSets({
        q: 'english',
        limit: 1,
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 500,
    });
  });
});
