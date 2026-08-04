import { getStudyOfflineDb } from '@/features/study-offline/db';
import type {
  MutationKind,
  QueuedMutation,
  StampedPendingAnswer,
} from '@/features/study-offline/types';
import { useStudyStore } from '@/features/study/store';

export type EnqueueFallback = {
  requeuePendingAnswers?: (answers: StampedPendingAnswer[]) => void;
};

function logQueueError(action: string, error: unknown) {
  console.error(`[study-offline/queue] ${action} failed`, error);
}

function defaultRequeue(answers: StampedPendingAnswer[]) {
  useStudyStore.getState().requeuePendingAnswers(answers);
}

/**
 * Enqueues one already-stamped mutation. Kind-aware IndexedDB failure fallback:
 * session-answer → requeuePendingAnswers; srs-review/session-complete → log-and-drop.
 */
export async function enqueueMutation(
  userId: string,
  kind: MutationKind,
  payload: Record<string, unknown>,
  clientMutationId: string,
  clientTimestamp: number,
  fallback: EnqueueFallback = {}
): Promise<void> {
  const row: QueuedMutation = {
    clientMutationId,
    userId,
    kind,
    clientTimestamp,
    payload,
    status: 'pending',
  };

  try {
    const db = await getStudyOfflineDb();
    await db.add('mutations', row);
  } catch (error) {
    logQueueError('enqueueMutation', error);
    if (kind === 'session-answer') {
      const answer: StampedPendingAnswer = {
        cardId: String(payload.cardId ?? ''),
        isCorrect: Boolean(payload.isCorrect),
        clientMutationId,
        clientTimestamp,
      };
      const requeue = fallback.requeuePendingAnswers ?? defaultRequeue;
      requeue([answer]);
    }
    // srs-review / session-complete: accepted degradation — log-and-drop
  }
}

/** Pending-only rows (for counts / replay eligibility). */
export async function getReplayableMutations(
  userId: string
): Promise<Array<QueuedMutation & { localId: number }>> {
  try {
    const db = await getStudyOfflineDb();
    const rows = await db.getAllFromIndex('mutations', 'by-userId', userId);
    return rows
      .filter((row): row is QueuedMutation & { localId: number } => typeof row.localId === 'number')
      .filter((row) => row.status === 'pending')
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp || a.localId - b.localId);
  } catch (error) {
    logQueueError('getReplayableMutations', error);
    return [];
  }
}

/** Pending + failed rows for a user, ordered by clientTimestamp ascending. */
export async function getPendingMutations(
  userId: string
): Promise<Array<QueuedMutation & { localId: number }>> {
  try {
    const db = await getStudyOfflineDb();
    const rows = await db.getAllFromIndex('mutations', 'by-userId', userId);
    return rows
      .filter((row): row is QueuedMutation & { localId: number } => typeof row.localId === 'number')
      .filter((row) => row.status === 'pending' || row.status === 'failed')
      .sort((a, b) => a.clientTimestamp - b.clientTimestamp || a.localId - b.localId);
  } catch (error) {
    logQueueError('getPendingMutations', error);
    return [];
  }
}

export async function getFailedMutations(
  userId: string
): Promise<Array<QueuedMutation & { localId: number }>> {
  try {
    const db = await getStudyOfflineDb();
    const rows = await db.getAllFromIndex('mutations', 'by-userId', userId);
    return rows
      .filter((row): row is QueuedMutation & { localId: number } => typeof row.localId === 'number')
      .filter((row) => row.status === 'failed');
  } catch (error) {
    logQueueError('getFailedMutations', error);
    return [];
  }
}

export async function markMutationSynced(localId: number): Promise<void> {
  try {
    const db = await getStudyOfflineDb();
    await db.delete('mutations', localId);
  } catch (error) {
    logQueueError('markMutationSynced', error);
  }
}

export async function markMutationFailed(localId: number, reason: string): Promise<void> {
  try {
    const db = await getStudyOfflineDb();
    const row = await db.get('mutations', localId);
    if (!row) return;
    await db.put('mutations', { ...row, status: 'failed', failReason: reason });
  } catch (error) {
    logQueueError('markMutationFailed', error);
  }
}

/** Reuse a durable completion-level id already queued for this session. */
export async function findPendingSessionCompleteId(
  userId: string,
  sessionId: string
): Promise<string | undefined> {
  try {
    const rows = await getReplayableMutations(userId);
    const hit = rows.find(
      (row) => row.kind === 'session-complete' && String(row.payload.sessionId ?? '') === sessionId
    );
    return hit?.clientMutationId;
  } catch (error) {
    logQueueError('findPendingSessionCompleteId', error);
    return undefined;
  }
}

/** Dismiss failed session-complete notices (does not delete pending rows). */
export async function dismissFailedMutations(userId: string): Promise<void> {
  try {
    const failed = await getFailedMutations(userId);
    const sessionCompleteFailed = failed.filter((row) => row.kind === 'session-complete');
    await Promise.all(sessionCompleteFailed.map((row) => markMutationSynced(row.localId)));
  } catch (error) {
    logQueueError('dismissFailedMutations', error);
  }
}

/** Enqueue one session-answer row per stamped answer (fan-out). */
export async function enqueueSessionAnswers(
  userId: string,
  sessionId: string,
  answers: StampedPendingAnswer[],
  fallback?: EnqueueFallback
): Promise<void> {
  for (const answer of answers) {
    await enqueueMutation(
      userId,
      'session-answer',
      {
        sessionId,
        cardId: answer.cardId,
        isCorrect: answer.isCorrect,
      },
      answer.clientMutationId,
      answer.clientTimestamp,
      fallback
    );
  }
}
