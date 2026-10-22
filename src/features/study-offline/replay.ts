import {
  getReplayableMutations,
  markMutationFailed,
  markMutationSynced,
  recordMutationAttempt,
} from '@/features/study-offline/queue';
import type { QueuedMutation } from '@/features/study-offline/types';
import { notifyStudyActivity } from '@/lib/study-activity';

export type ReplayResult = {
  synced: number;
  failed: number;
  halted: boolean;
  haltReason?: 'network' | 'rate_limited' | 'unauthorized';
  /** Seconds until a one-shot scheduled retry (429 only). */
  retryAfterSec?: number;
};

type RateLimitBody = {
  details?: { retryAfter?: number };
};

const scheduledRetryByUser = new Map<string, ReturnType<typeof setTimeout>>();

/** Test helper — clears one-shot 429 retry timers. */
export function clearScheduledReplayRetriesForTests() {
  for (const handle of scheduledRetryByUser.values()) {
    clearTimeout(handle);
  }
  scheduledRetryByUser.clear();
}

function scheduleOneShotRetry(userId: string, retryAfterSec: number) {
  const existing = scheduledRetryByUser.get(userId);
  if (existing) {
    clearTimeout(existing);
  }
  const delayMs = retryAfterSec * 1000 + Math.floor(Math.random() * 500);
  const handle = setTimeout(() => {
    scheduledRetryByUser.delete(userId);
    void replayPendingMutations(userId);
  }, delayMs);
  scheduledRetryByUser.set(userId, handle);
}

async function readRetryAfter(response: Response): Promise<number> {
  const body = (await response.json().catch(() => ({}))) as RateLimitBody;
  return body.details?.retryAfter ?? 5;
}

type DispatchOutcome =
  | { kind: 'synced' }
  | { kind: 'failed' }
  | { kind: 'halt-network' }
  | { kind: 'halt-401' }
  | { kind: 'halt-429'; retryAfterSec: number };

/** A 5xx is retried on later replays at most this many times before dead-lettering. */
export const MAX_REPLAY_ATTEMPTS = 5;

/**
 * Shared non-OK handling for every mutation kind.
 * - 401: halt (keep rows until the user signs in again)
 * - 429: halt and schedule one retry
 * - 408: transient, halt like a network error
 * - other 4xx: permanent (bad payload, gone, forbidden) → dead-letter so one row
 *   cannot block the whole queue forever
 * - 5xx: transient, retried up to MAX_REPLAY_ATTEMPTS, then dead-lettered
 */
async function handleFailedResponse(response: Response, localId: number): Promise<DispatchOutcome> {
  const { status } = response;
  if (status === 401) return { kind: 'halt-401' };
  if (status === 429) return { kind: 'halt-429', retryAfterSec: await readRetryAfter(response) };
  if (status === 408) return { kind: 'halt-network' };
  if (status >= 400 && status < 500) {
    await markMutationFailed(localId, `http_${status}`);
    return { kind: 'failed' };
  }
  const attempts = await recordMutationAttempt(localId);
  if (attempts >= MAX_REPLAY_ATTEMPTS) {
    await markMutationFailed(localId, `http_${status}_after_${attempts}_attempts`);
    return { kind: 'failed' };
  }
  return { kind: 'halt-network' };
}

async function dispatchMutation(
  mutation: QueuedMutation & { localId: number }
): Promise<DispatchOutcome> {
  const { kind, payload, clientMutationId, localId } = mutation;

  try {
    if (kind === 'session-answer') {
      const sessionId = String(payload.sessionId ?? '');
      const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [
            {
              cardId: payload.cardId,
              isCorrect: payload.isCorrect,
              clientMutationId,
            },
          ],
        }),
      });

      if (!response.ok) return handleFailedResponse(response, localId);

      const body = (await response.json()) as {
        data?: { recorded?: number; reason?: string };
      };
      if (body.data?.reason === 'session_already_completed') {
        await markMutationFailed(localId, 'session_already_completed');
        return { kind: 'failed' };
      }
      await markMutationSynced(localId);
      return { kind: 'synced' };
    }

    if (kind === 'session-complete') {
      const sessionId = String(payload.sessionId ?? '');
      const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctCount: payload.correctCount,
          answers: payload.answers,
          clientMutationId,
        }),
      });

      if (!response.ok) return handleFailedResponse(response, localId);

      const body = (await response.json()) as { alreadyCompleted?: boolean };
      if (body.alreadyCompleted === true) {
        await markMutationFailed(localId, 'session_already_completed');
        return { kind: 'failed' };
      }
      await markMutationSynced(localId);
      return { kind: 'synced' };
    }

    const response = await fetch('/api/v1/study/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: payload.cardId,
        grade: payload.grade,
        responseMs: payload.responseMs,
        clientMutationId,
      }),
    });

    if (!response.ok) return handleFailedResponse(response, localId);

    await markMutationSynced(localId);
    return { kind: 'synced' };
  } catch {
    return { kind: 'halt-network' };
  }
}

async function runReplay(userId: string): Promise<ReplayResult> {
  const pending = await getReplayableMutations(userId);
  let synced = 0;
  let failed = 0;

  for (const mutation of pending) {
    const outcome = await dispatchMutation(mutation);
    if (outcome.kind === 'synced') {
      synced += 1;
      continue;
    }
    if (outcome.kind === 'failed') {
      failed += 1;
      continue;
    }
    if (outcome.kind === 'halt-429') {
      scheduleOneShotRetry(userId, outcome.retryAfterSec);
      return {
        synced,
        failed,
        halted: true,
        haltReason: 'rate_limited',
        retryAfterSec: outcome.retryAfterSec,
      };
    }
    if (outcome.kind === 'halt-401') {
      return { synced, failed, halted: true, haltReason: 'unauthorized' };
    }
    return { synced, failed, halted: true, haltReason: 'network' };
  }

  return { synced, failed, halted: false };
}

/**
 * Replays pending mutations sequentially (one request per row).
 * Serialized across tabs via Web Locks when available; unlocked fallback otherwise.
 * On 429: leaves row pending, schedules exactly one delayed retry for this userId.
 */
export async function replayPendingMutations(userId: string): Promise<ReplayResult> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  const result = locks?.request
    ? await locks.request('study-offline-replay', () => runReplay(userId))
    : await runReplay(userId);
  if (result.synced > 0) {
    notifyStudyActivity();
  }
  return result;
}
