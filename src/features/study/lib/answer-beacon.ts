import type { StampedPendingAnswer } from '@/features/study/store';
import { enqueueSessionAnswers } from '@/features/study-offline/queue';

const noopRequeueFallback = {
  requeuePendingAnswers: () => undefined,
};

export function sessionAnswersBeaconUrl(sessionId: string) {
  // sendBeacon always uses POST; the session route exposes a POST batch handler for it.
  return `/api/v1/study/sessions/${sessionId}`;
}

function toBeaconBlob(answers: StampedPendingAnswer[]) {
  return new Blob(
    [
      JSON.stringify({
        answers: answers.map((answer) => ({
          cardId: answer.cardId,
          isCorrect: answer.isCorrect,
          clientMutationId: answer.clientMutationId,
        })),
      }),
    ],
    { type: 'application/json' }
  );
}

/**
 * Best-effort flush of buffered answers while the page is hiding or unmounting.
 * When the beacon cannot be queued or the browser is offline, the stamped answers
 * go to the durable IndexedDB queue instead, so the caller can always clear them.
 */
export function beaconSessionAnswers(
  sessionId: string,
  answers: StampedPendingAnswer[],
  userId: string | undefined
): void {
  if (answers.length === 0) return;
  const snapshot = [...answers];

  let queued = false;
  try {
    queued =
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(sessionAnswersBeaconUrl(sessionId), toBeaconBlob(snapshot));
  } catch {
    queued = false;
  }

  const offline = typeof navigator.onLine === 'boolean' && !navigator.onLine;
  if ((!queued || offline) && userId) {
    void enqueueSessionAnswers(userId, sessionId, snapshot, noopRequeueFallback);
  }
}
