'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { enqueueMutation } from '@/features/study-offline/queue';

export function useDueCards() {
  return useQuery({
    queryKey: ['study', 'due-cards'],
    queryFn: async () => {
      const response = await fetch('/api/v1/study/due-cards');
      if (!response.ok) {
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
  });
}

export type SubmitReviewResult =
  | { status: 'ok'; data: unknown }
  | { status: 'queued' }
  | { status: 'error'; httpStatus?: number };

function shouldEnqueueReview(status: number): boolean {
  // Durable queue only for transient / auth-expiry cases — not definitive 4xx.
  return status >= 500 || status === 401 || status === 0;
}

export function useSubmitReview() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return async (
    cardId: string,
    grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'
  ): Promise<SubmitReviewResult> => {
    const clientMutationId = crypto.randomUUID();
    const clientTimestamp = Date.now();

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
        await enqueueMutation(
          userId,
          'srs-review',
          { cardId, grade },
          clientMutationId,
          clientTimestamp
        );
        return { status: 'queued' };
      }

      // 404/403/429/other client errors: do not invent a durable retry channel.
      return { status: 'error', httpStatus: response.status };
    } catch {
      if (userId) {
        await enqueueMutation(
          userId,
          'srs-review',
          { cardId, grade },
          clientMutationId,
          clientTimestamp
        );
        return { status: 'queued' };
      }
      return { status: 'error' };
    }
  };
}
