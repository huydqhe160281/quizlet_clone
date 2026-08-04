import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStudyOfflineDbForTests, getStudyOfflineDb } from '@/features/study-offline/db';
import { enqueueMutation, getReplayableMutations } from '@/features/study-offline/queue';
import {
  clearScheduledReplayRetriesForTests,
  replayPendingMutations,
} from '@/features/study-offline/replay';

describe('study-offline replay', () => {
  beforeEach(() => {
    resetStudyOfflineDbForTests();
    indexedDB = new IDBFactory();
    vi.unstubAllGlobals();
    clearScheduledReplayRetriesForTests();
  });

  afterEach(() => {
    clearScheduledReplayRetriesForTests();
  });

  it('Scenario: Replay processes mutations individually and in order', async () => {
    const order: string[] = [];
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c1', isCorrect: true },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      1
    );
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c2', isCorrect: false },
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      2
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          answers: Array<{ cardId: string }>;
        };
        order.push(body.answers[0]!.cardId);
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { recorded: 1 } }),
        };
      })
    );

    await replayPendingMutations('user-a');
    expect(order).toEqual(['c1', 'c2']);
    expect(await getReplayableMutations('user-a')).toHaveLength(0);
  });

  it('Scenario: A recorded: 0 response with no failure reason is still a success', async () => {
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c1', isCorrect: true },
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      1
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { recorded: 0 } }),
      }))
    );
    await replayPendingMutations('user-a');
    expect(await getReplayableMutations('user-a')).toHaveLength(0);
  });

  it('Scenario: Already-completed session is a distinguishable outcome, not silent success', async () => {
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c1', isCorrect: true },
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      1
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: { recorded: 0, reason: 'session_already_completed' },
        }),
      }))
    );
    const result = await replayPendingMutations('user-a');
    expect(result.failed).toBe(1);
    expect(await getReplayableMutations('user-a')).toHaveLength(0);
  });

  it('Scenario: Rate limiting is retried, not discarded', async () => {
    await enqueueMutation(
      'user-a',
      'session-answer',
      { sessionId: 's1', cardId: 'c1', isCorrect: true },
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      1
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({ details: { retryAfter: 0 } }),
      }))
    );
    const result = await replayPendingMutations('user-a');
    expect(result.halted).toBe(true);
    expect(result.haltReason).toBe('rate_limited');
    expect(await getReplayableMutations('user-a')).toHaveLength(1);
  });

  it('opens db schema with sets + mutations stores', async () => {
    const db = await getStudyOfflineDb();
    expect(db.objectStoreNames.contains('sets')).toBe(true);
    expect(db.objectStoreNames.contains('mutations')).toBe(true);
  });
});
