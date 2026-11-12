'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { enqueueMutation } from '@/features/study-offline/queue';
import {
  STUDY_LIMIT_REACHED,
  StudyLimitError,
  isStudyLimitError,
} from '@/features/study/lib/study-limit';
import { readErrorPayload } from '@/lib/i18n/api-error-message';

export function useDueCards() {
  return useQuery({
    queryKey: ['study', 'due-cards'],
    queryFn: async () => {
      const response = await fetch('/api/v1/study/due-cards');
      if (!response.ok) {
        const payload = await readErrorPayload(response);
        if (payload?.error === STUDY_LIMIT_REACHED) throw new StudyLimitError();
        throw new Error('Failed to load due cards');
      }
      return (await response.json()) as {
        data: Array<{
          cardId: string;
          front: string;
          back: string;
          setId: string;
          setTitle: string;
        }>;
        count: number;
      };
    },
    // The limit only lifts after verifying; retrying just delays the notice.
    retry: (failureCount, error) => !isStudyLimitError(error) && failureCount < 3,
  });
}

export type SubmitReviewResult =
  | { status: 'ok'; data: unknown }
  | { status: 'queued' }
  | { status: 'error'; httpStatus?: number };

function shouldEnqueueReview(status: number): boolean {
  // Durable queue only for transient / auth-expiry cases — not definitive 4xx. A 429 is
  // transient too: grading is optimistic, so the replay (which honours Retry-After) is
  // the only way a rate-limited review still counts.
  return status >= 500 || status === 401 || status === 429 || status === 0;
}

export function useSubmitReview() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Grading does not wait for the server, so reviews are chained: two in flight for the
  // same card (a grade and its requeued retry) would race on its CardProgress row.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const send = async (
    cardId: string,
    grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
    clientMutationId: string,
    clientTimestamp: number
  ): Promise<SubmitReviewResult> => {
    try {
      const response = await fetch('/api/v1/study/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, grade, clientMutationId }),
      });
      if (response.ok) {
        return { status: 'ok', data: await response.json() };
      }

      if (shouldEnqueueReview(response.status) && userId) {
        const queued = await enqueueMutation(
          userId,
          'srs-review',
          { cardId, grade },
          clientMutationId,
          clientTimestamp
        );
        return queued ? { status: 'queued' } : { status: 'error' };
      }

      // 404/403/429/other client errors: do not invent a durable retry channel.
      return { status: 'error', httpStatus: response.status };
    } catch {
      if (userId) {
        const queued = await enqueueMutation(
          userId,
          'srs-review',
          { cardId, grade },
          clientMutationId,
          clientTimestamp
        );
        return queued ? { status: 'queued' } : { status: 'error' };
      }
      return { status: 'error' };
    }
  };

  return (
    cardId: string,
    grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'
  ): Promise<SubmitReviewResult> => {
    // Stamped at grade time, not when the chained request actually goes out.
    const clientMutationId = crypto.randomUUID();
    const clientTimestamp = Date.now();
    const result = queueRef.current.then(() =>
      send(cardId, grade, clientMutationId, clientTimestamp)
    );
    queueRef.current = result.catch(() => undefined);
    return result;
  };
}
