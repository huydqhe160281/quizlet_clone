import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudyOfflineDb, resetStudyOfflineDbForTests } from '@/features/study-offline/db';
import { enqueueMutation } from '@/features/study-offline/queue';

describe('offline study IndexedDB connection', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
  });

  it('retries after a failed open instead of caching the failure', async () => {
    const realOpen = indexedDB.open.bind(indexedDB);
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });

    await expect(getStudyOfflineDb()).rejects.toThrow('storage unavailable');

    openSpy.mockImplementation(realOpen);
    const db = await getStudyOfflineDb();
    expect(db.objectStoreNames.contains('mutations')).toBe(true);
  });
});

describe('enqueueMutation result', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
  });

  it('reports true once the row is stored, including a duplicate enqueue', async () => {
    await expect(enqueueMutation('u', 'srs-review', { cardId: 'c' }, 'm-1', 1)).resolves.toBe(true);
    await expect(enqueueMutation('u', 'srs-review', { cardId: 'c' }, 'm-1', 1)).resolves.toBe(true);
  });

  it('reports false when a review cannot be stored, so the UI does not claim it was saved', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('quota');
    });

    await expect(enqueueMutation('u', 'srs-review', { cardId: 'c' }, 'm-2', 1)).resolves.toBe(
      false
    );
    spy.mockRestore();
  });
});
