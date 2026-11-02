import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: { findUnique: vi.fn(), findFirst: vi.fn() },
  flashcard: { findMany: vi.fn(), aggregate: vi.fn(), createMany: vi.fn() },
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: vi.fn() }));

import { reorderCards } from '@/server/services/sets/card.service';
import { importJsonToExisting } from '@/server/services/sets/import.service';

describe('reorderCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.flashcardSet.findUnique.mockResolvedValue({
      id: 'set-1',
      userId: 'user-a',
      visibility: 'PRIVATE',
    });
    prismaMock.flashcard.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('rejects duplicate ids that would leave a card with a colliding position', async () => {
    await expect(reorderCards('set-1', 'user-a', ['a', 'a', 'c'])).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
  });

  it('writes the new order in a single statement scoped to the set', async () => {
    await reorderCards('set-1', 'user-a', ['c', 'a', 'b']);

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = prismaMock.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toContain('WITH ORDINALITY');
    expect(values).toEqual([['c', 'a', 'b'], 'set-1']);
  });
});

describe('importJsonToExisting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.flashcardSet.findFirst.mockResolvedValue({
      id: 'set-1',
      title: 'Set',
      visibility: 'PRIVATE',
    });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock)
    );
    prismaMock.flashcard.createMany.mockResolvedValue({ count: 2 });
  });

  it('appends after the highest sortOrder, not the card count (deletes leave gaps)', async () => {
    // 5 cards remain at positions 5..9 after deleting 0..4.
    prismaMock.flashcard.aggregate.mockResolvedValue({ _max: { sortOrder: 9 } });

    await importJsonToExisting('user-a', 'set-1', {
      format: 'json',
      cards: [
        { front: 'x', back: 'y' },
        { front: 'p', back: 'q' },
      ],
    });

    const { data } = prismaMock.flashcard.createMany.mock.calls[0]?.[0] as {
      data: Array<{ setId: string; sortOrder: number }>;
    };
    expect(data.map((row) => row.sortOrder)).toEqual([10, 11]);
    expect(data.every((row) => row.setId === 'set-1')).toBe(true);
  });

  it('starts at 0 for an empty set', async () => {
    prismaMock.flashcard.aggregate.mockResolvedValue({ _max: { sortOrder: null } });

    await importJsonToExisting('user-a', 'set-1', {
      format: 'json',
      cards: [{ front: 'x', back: 'y' }],
    });

    const { data } = prismaMock.flashcard.createMany.mock.calls[0]?.[0] as {
      data: Array<{ sortOrder: number }>;
    };
    expect(data[0]?.sortOrder).toBe(0);
  });
});

describe('folder changes invalidate the cached per-user set lists', () => {
  it('add, remove and delete all revalidate sets-<userId>', async () => {
    const { revalidateTag } = await import('next/cache');
    const db = prismaMock as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
    db.folder = {
      findUnique: vi.fn().mockResolvedValue({ id: 'f1', userId: 'user-a' }),
      delete: vi.fn(),
    };
    db.folderSet = { upsert: vi.fn().mockResolvedValue({}), deleteMany: vi.fn() };
    prismaMock.flashcardSet.findUnique.mockResolvedValue({ id: 'set-1', userId: 'user-a' });
    const { addSetToFolder, removeSetFromFolder, deleteFolder } =
      await import('@/server/services/folder.service');

    for (const action of [
      () => addSetToFolder('f1', 'user-a', 'set-1'),
      () => removeSetFromFolder('f1', 'user-a', 'set-1'),
      () => deleteFolder('f1', 'user-a'),
    ]) {
      vi.mocked(revalidateTag).mockClear();
      await action();
      expect(revalidateTag).toHaveBeenCalledWith('sets-user-a');
    }
  });
});
