import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCachedSetsForUser,
  getCachedSet,
  purgeForeignCachedSets,
  upsertCachedSet,
} from '@/features/study-offline/cache';
import { resetStudyOfflineDbForTests } from '@/features/study-offline/db';

const card = {
  sessionCardId: 'sc-1',
  cardId: 'c1',
  front: 'front',
  back: 'back',
  example: null,
  imageUrl: null,
};

describe('study-offline cache', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario: Starting or resuming a session online caches it', async () => {
    await upsertCachedSet('user-a', 'set-1', 'session-1', 'Title', [card]);
    const hit = await getCachedSet('user-a', 'set-1');
    expect(hit?.sessionId).toBe('session-1');
    expect(hit?.setTitle).toBe('Title');
    expect(hit?.cards).toHaveLength(1);
  });

  it('Scenario: LRU eviction beyond 5 entries', async () => {
    for (let i = 0; i < 6; i += 1) {
      await upsertCachedSet('user-a', `set-${i}`, `session-${i}`, `T${i}`, [card]);
      await new Promise((r) => setTimeout(r, 2));
    }
    const oldest = await getCachedSet('user-a', 'set-0');
    expect(oldest).toBeUndefined();
    expect(await getCachedSet('user-a', 'set-5')).toBeDefined();
  });

  it('Scenario: Re-viewing a cached set refreshes recency', async () => {
    await upsertCachedSet('user-a', 'set-a', 's-a', 'A', [card]);
    await new Promise((r) => setTimeout(r, 2));
    await upsertCachedSet('user-a', 'set-b', 's-b', 'B', [card]);
    await getCachedSet('user-a', 'set-a');
    for (let i = 0; i < 4; i += 1) {
      await upsertCachedSet('user-a', `set-x${i}`, `sx${i}`, `X${i}`, [card]);
      await new Promise((r) => setTimeout(r, 2));
    }
    expect(await getCachedSet('user-a', 'set-a')).toBeDefined();
    expect(await getCachedSet('user-a', 'set-b')).toBeUndefined();
  });

  it('Scenario: Cache is scoped per user', async () => {
    await upsertCachedSet('user-a', 'set-1', 's-a', 'A', [card]);
    await upsertCachedSet('user-b', 'set-1', 's-b', 'B', [card]);
    expect((await getCachedSet('user-a', 'set-1'))?.sessionId).toBe('s-a');
    expect((await getCachedSet('user-b', 'set-1'))?.sessionId).toBe('s-b');
  });

  it("Scenario: Sign-out clears this user's content cache", async () => {
    await upsertCachedSet('user-a', 'set-1', 's-a', 'A', [card]);
    await upsertCachedSet('user-b', 'set-1', 's-b', 'B', [card]);
    await clearCachedSetsForUser('user-a');
    expect(await getCachedSet('user-a', 'set-1')).toBeUndefined();
    expect(await getCachedSet('user-b', 'set-1')).toBeDefined();
  });

  it("Scenario: Sign-in purges a previous user's residual content", async () => {
    await upsertCachedSet('user-old', 'set-1', 's-old', 'Old', [card]);
    await purgeForeignCachedSets('user-new');
    expect(await getCachedSet('user-old', 'set-1')).toBeUndefined();
  });
});
