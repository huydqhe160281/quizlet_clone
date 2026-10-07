import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  flashcard: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  prisma: prismaMock,
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache:
    <T>(fn: () => T | Promise<T>) =>
    () =>
      fn(),
}));

import {
  createSet,
  deleteSet,
  duplicateSet,
  getSet,
  getSets,
  splitSet,
  updateSet,
} from '@/server/services/sets/set.service';

describe('set.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  it('test_create_set_valid: creates set for owner', async () => {
    prismaMock.flashcardSet.create.mockResolvedValue({
      id: 'set-1',
      title: 'English Vocab',
      userId: 'user-a',
      visibility: 'PRIVATE',
      tags: [],
      _count: { cards: 0 },
    });

    const result = await createSet('user-a', {
      title: 'English Vocab',
      visibility: 'PRIVATE',
    });

    expect(result.title).toBe('English Vocab');
    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'English Vocab',
          userId: 'user-a',
          visibility: 'PRIVATE',
        }),
      })
    );
  });

  it('test_create_set_with_tags: attaches tag relations', async () => {
    prismaMock.flashcardSet.create.mockResolvedValue({
      id: 'set-2',
      title: 'Tagged',
      userId: 'user-a',
      visibility: 'PRIVATE',
      tags: [],
      _count: { cards: 0 },
    });

    await createSet('user-a', {
      title: 'Tagged',
      visibility: 'PRIVATE',
      tagIds: ['tag-1'],
    });

    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: { create: [{ tagId: 'tag-1' }] },
        }),
      })
    );
  });

  it('test_update_set_not_found: throws when set missing', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue(null);
    await expect(updateSet('missing', 'user-a', { title: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('test_get_set_public_readable: allows any user to read public set', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-pub',
      userId: 'user-a',
      visibility: 'PUBLIC',
      tags: [],
      _count: { cards: 2 },
    });

    const set = await getSet('set-pub', 'user-b');
    expect(set.visibility).toBe('PUBLIC');
  });

  it('test_update_set_forbidden: rejects non-owner updates', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
    });

    await expect(updateSet('set-1', 'user-b', { title: 'Hacked' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('test_get_set_not_found: throws 404', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue(null);
    await expect(getSet('missing')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('test_get_set_private_forbidden: blocks non-owner', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
      tags: [],
      _count: { cards: 0 },
    });
    await expect(getSet('set-1', 'user-b')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('test_get_sets_pagination: returns cursor pagination', async () => {
    prismaMock.flashcardSet.findMany.mockResolvedValue([
      { id: 'set-1', title: 'A', tags: [], _count: { cards: 1 } },
      { id: 'set-2', title: 'B', tags: [], _count: { cards: 2 } },
    ]);

    const result = await getSets('user-a', { limit: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe('set-1');
  });

  it('test_delete_set_cascade: owner can delete set (cards cascade at DB level)', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
    });
    prismaMock.flashcardSet.delete.mockResolvedValue({ id: 'set-1' });

    await deleteSet('set-1', 'user-a');

    expect(prismaMock.flashcardSet.delete).toHaveBeenCalledWith({
      where: { id: 'set-1' },
    });
  });

  it('test_duplicate_public_set: copies cards into private duplicate', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'public-set',
      title: 'Public Set',
      description: 'desc',
      language: 'en',
      visibility: 'PUBLIC',
      coverImage: null,
      userId: 'user-a',
      cards: [
        {
          front: 'hello',
          back: 'xin chào',
          example: null,
          imageUrl: null,
          audioUrl: null,
          sortOrder: 0,
        },
      ],
    });

    prismaMock.flashcardSet.create.mockResolvedValue({
      id: 'copy-set',
      title: 'Public Set (copy)',
      userId: 'user-b',
      visibility: 'PRIVATE',
      tags: [],
      _count: { cards: 1 },
    });

    const duplicate = await duplicateSet('public-set', 'user-b');

    expect(duplicate.visibility).toBe('PRIVATE');
    expect(prismaMock.flashcardSet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-b',
          visibility: 'PRIVATE',
          cards: {
            create: [expect.objectContaining({ front: 'hello', back: 'xin chào', sortOrder: 0 })],
          },
        }),
      })
    );
  });

  it('test_split_set_chunks: splits 45 cards into 3 private sets and leaves source untouched', async () => {
    const cards = Array.from({ length: 45 }, (_, index) => ({
      front: `f${index}`,
      back: `b${index}`,
      example: null,
      imageUrl: null,
      audioUrl: null,
      type: index === 0 ? 'new-word' : null,
      sortOrder: index,
    }));

    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'source-set',
      title: 'Big Set',
      description: 'desc',
      language: 'en',
      visibility: 'PUBLIC',
      coverImage: 'cover.png',
      userId: 'user-a',
      cards,
    });

    prismaMock.flashcardSet.create
      .mockResolvedValueOnce({
        id: 'part-1',
        title: 'Big Set (1/3)',
        visibility: 'PRIVATE',
        tags: [],
        _count: { cards: 20 },
      })
      .mockResolvedValueOnce({
        id: 'part-2',
        title: 'Big Set (2/3)',
        visibility: 'PRIVATE',
        tags: [],
        _count: { cards: 20 },
      })
      .mockResolvedValueOnce({
        id: 'part-3',
        title: 'Big Set (3/3)',
        visibility: 'PRIVATE',
        tags: [],
        _count: { cards: 5 },
      });

    const result = await splitSet('source-set', 'user-a', 20);

    expect(result).toHaveLength(3);
    expect(prismaMock.flashcardSet.create).toHaveBeenCalledTimes(3);
    expect(prismaMock.flashcardSet.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Big Set (1/3)',
          description: 'desc',
          language: 'en',
          visibility: 'PRIVATE',
          coverImage: 'cover.png',
          userId: 'user-a',
          cards: {
            create: expect.arrayContaining([
              expect.objectContaining({ front: 'f0', type: 'new-word', sortOrder: 0 }),
              expect.objectContaining({ front: 'f19', sortOrder: 19 }),
            ]),
          },
        }),
      })
    );
    expect(prismaMock.flashcardSet.create.mock.calls[0]?.[0].data.cards.create).toHaveLength(20);
    expect(prismaMock.flashcardSet.create.mock.calls[1]?.[0].data.cards.create).toHaveLength(20);
    expect(prismaMock.flashcardSet.create.mock.calls[2]?.[0].data.cards.create).toHaveLength(5);
    expect(prismaMock.flashcardSet.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Big Set (2/3)' }),
      })
    );
    expect(prismaMock.flashcardSet.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Big Set (3/3)' }),
      })
    );
    expect(prismaMock.flashcardSet.update).not.toHaveBeenCalled();
    expect(prismaMock.flashcardSet.delete).not.toHaveBeenCalled();
  });

  it('test_split_set_forbidden: rejects non-owner', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'source-set',
      title: 'Owned',
      userId: 'user-a',
      cards: [
        {
          front: 'a',
          back: 'b',
          example: null,
          imageUrl: null,
          audioUrl: null,
          type: null,
          sortOrder: 0,
        },
        {
          front: 'c',
          back: 'd',
          example: null,
          imageUrl: null,
          audioUrl: null,
          type: null,
          sortOrder: 1,
        },
      ],
    });

    await expect(splitSet('source-set', 'user-b', 1)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
    expect(prismaMock.flashcardSet.create).not.toHaveBeenCalled();
  });

  it('test_split_set_chunk_too_large: rejects when chunkSize >= total cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'source-set',
      title: 'Small',
      userId: 'user-a',
      cards: [
        {
          front: 'a',
          back: 'b',
          example: null,
          imageUrl: null,
          audioUrl: null,
          type: null,
          sortOrder: 0,
        },
        {
          front: 'c',
          back: 'd',
          example: null,
          imageUrl: null,
          audioUrl: null,
          type: null,
          sortOrder: 1,
        },
      ],
    });

    await expect(splitSet('source-set', 'user-a', 2)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('test_split_set_empty: rejects set with no cards', async () => {
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'empty-set',
      title: 'Empty',
      userId: 'user-a',
      cards: [],
    });

    await expect(splitSet('empty-set', 'user-a', 20)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });
});

describe('upload.service validation', () => {
  it('test_upload_presigned_url_file_size_exceeded: rejects oversized image', async () => {
    const { validatePresignedUpload } = await import('@/server/services/upload.service');

    expect(() =>
      validatePresignedUpload({
        fileType: 'image',
        fileName: 'big.jpg',
        mimeType: 'image/jpeg',
        fileSize: 6_000_000,
      })
    ).toThrowError(expect.objectContaining({ code: 'FILE_TOO_LARGE' }));
  });
});
