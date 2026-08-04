import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudyOfflineDb, resetStudyOfflineDbForTests } from '@/features/study-offline/db';
import {
  enqueueMutation,
  getPendingMutations,
  getReplayableMutations,
} from '@/features/study-offline/queue';
import type { StampedPendingAnswer } from '@/features/study-offline/types';

describe('study-offline queue', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
  });

  it('Scenario: A multi-answer round flush enqueues one row per answer', async () => {
    const a: StampedPendingAnswer = {
      cardId: 'c1',
      isCorrect: true,
      clientMutationId: '11111111-1111-4111-8111-111111111111',
      clientTimestamp: 1,
    };
    const b: StampedPendingAnswer = {
      cardId: 'c2',
      isCorrect: false,
      clientMutationId: '22222222-2222-4222-8222-222222222222',
      clientTimestamp: 2,
    };
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: a.cardId, isCorrect: a.isCorrect },
      a.clientMutationId,
      a.clientTimestamp
    );
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: b.cardId, isCorrect: b.isCorrect },
      b.clientMutationId,
      b.clientTimestamp
    );
    const rows = await getPendingMutations('user-a');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.clientMutationId)).toEqual([a.clientMutationId, b.clientMutationId]);
  });

  it('Scenario: Queue survives refresh', async () => {
    await enqueueMutation(
      'user-a',
      'srs-review',
      { cardId: 'c1', grade: 'GOOD' },
      '33333333-3333-4333-8333-333333333333',
      10
    );
    resetStudyOfflineDbForTests();
    const rows = await getReplayableMutations('user-a');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('srs-review');
  });

  it('Scenario: IndexedDB unavailability degrades gracefully without regenerating the mutation ID', async () => {
    const db = await getStudyOfflineDb();
    vi.spyOn(db, 'add').mockRejectedValueOnce(new Error('idb down'));
    const requeued: StampedPendingAnswer[] = [];

    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c1', isCorrect: true },
      '44444444-4444-4444-8444-444444444444',
      20,
      {
        requeuePendingAnswers: (answers) => {
          requeued.push(...answers);
        },
      }
    );

    expect(requeued).toHaveLength(1);
    expect(requeued[0]?.clientMutationId).toBe('44444444-4444-4444-8444-444444444444');
  });

  it('Scenario: IndexedDB unavailability for a review logs and drops (no invented channel)', async () => {
    const db = await getStudyOfflineDb();
    vi.spyOn(db, 'add').mockRejectedValueOnce(new Error('idb down'));
    const requeued: StampedPendingAnswer[] = [];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await enqueueMutation(
      'user-a',
      'srs-review',
      { cardId: 'c1', grade: 'GOOD' },
      '55555555-5555-4555-8555-555555555555',
      30,
      {
        requeuePendingAnswers: (answers) => {
          requeued.push(...answers);
        },
      }
    );

    expect(requeued).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
