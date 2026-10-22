import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStudyOfflineDbForTests } from '@/features/study-offline/db';
import { getCachedSet, upsertCachedSet } from '@/features/study-offline/cache';
import {
  dismissFailedMutations,
  enqueueMutation,
  getFailedMutations,
  getPendingMutations,
  getReplayableMutations,
} from '@/features/study-offline/queue';
import {
  MAX_REPLAY_ATTEMPTS,
  clearScheduledReplayRetriesForTests,
  replayPendingMutations,
} from '@/features/study-offline/replay';
import { prepareOfflineDataForSignOut } from '@/features/study-offline/flush-before-signout';

const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';

function respond(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

async function enqueueAnswer(id: string, timestamp: number) {
  await enqueueMutation(
    'user-a',
    'session-answer',
    { sessionId: 's1', cardId: `card-${id}`, isCorrect: true },
    id,
    timestamp
  );
}

describe('offline replay reliability', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
    vi.unstubAllGlobals();
    clearScheduledReplayRetriesForTests();
  });

  afterEach(() => {
    clearScheduledReplayRetriesForTests();
  });

  it.each([400, 405, 409, 422])(
    'a permanent %i dead-letters the row so later rows still sync',
    async (status) => {
      await enqueueAnswer(ID_1, 1);
      await enqueueAnswer(ID_2, 2);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(respond(status))
        .mockResolvedValueOnce(respond(200, { data: { recorded: 1 } }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await replayPendingMutations('user-a');

      expect(result).toMatchObject({ synced: 1, failed: 1, halted: false });
      expect(await getReplayableMutations('user-a')).toHaveLength(0);
      expect((await getFailedMutations('user-a'))[0]?.failReason).toBe(`http_${status}`);
    }
  );

  it('a 5xx keeps the row pending until MAX_REPLAY_ATTEMPTS, then dead-letters it', async () => {
    await enqueueAnswer(ID_1, 1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(500)));

    for (let attempt = 1; attempt < MAX_REPLAY_ATTEMPTS; attempt += 1) {
      const result = await replayPendingMutations('user-a');
      expect(result).toMatchObject({ halted: true, haltReason: 'network' });
      expect(await getReplayableMutations('user-a')).toHaveLength(1);
    }

    const last = await replayPendingMutations('user-a');
    expect(last.failed).toBe(1);
    expect(await getReplayableMutations('user-a')).toHaveLength(0);
  });

  it('a thrown fetch (offline) halts without spending an attempt', async () => {
    await enqueueAnswer(ID_1, 1);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    for (let i = 0; i < MAX_REPLAY_ATTEMPTS + 2; i += 1) {
      await replayPendingMutations('user-a');
    }

    const [row] = await getReplayableMutations('user-a');
    expect(row?.attempts ?? 0).toBe(0);
  });

  it('401 still halts and keeps the row', async () => {
    await enqueueAnswer(ID_1, 1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401)));

    const result = await replayPendingMutations('user-a');

    expect(result).toMatchObject({ halted: true, haltReason: 'unauthorized' });
    expect(await getReplayableMutations('user-a')).toHaveLength(1);
  });

  it('enqueueing the same clientMutationId twice stores one row', async () => {
    await enqueueAnswer(ID_1, 1);
    await enqueueAnswer(ID_1, 1);

    expect(await getPendingMutations('user-a')).toHaveLength(1);
  });

  it('dismissing failed notices clears failed answers and reviews, not only completions', async () => {
    await enqueueAnswer(ID_1, 1);
    await enqueueMutation('user-a', 'srs-review', { cardId: 'c', grade: 'GOOD' }, ID_2, 2);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(404)));
    await replayPendingMutations('user-a');
    expect(await getFailedMutations('user-a')).toHaveLength(2);

    await dismissFailedMutations('user-a');

    expect(await getFailedMutations('user-a')).toHaveLength(0);
  });
});

describe('sign-out', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { data: { recorded: 1 } })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes the signed-out user's cached card content (not other users')", async () => {
    const card = {
      sessionCardId: 'sc',
      cardId: 'c',
      front: 'f',
      back: 'b',
      example: null,
      imageUrl: null,
    };
    await upsertCachedSet('user-a', 'set-1', 's-a', 'A', [card]);
    await upsertCachedSet('user-b', 'set-1', 's-b', 'B', [card]);

    await prepareOfflineDataForSignOut('user-a');

    expect(await getCachedSet('user-a', 'set-1')).toBeUndefined();
    expect(await getCachedSet('user-b', 'set-1')).toBeDefined();
  });
});
