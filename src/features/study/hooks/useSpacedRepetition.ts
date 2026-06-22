'use client';

import { useQuery } from '@tanstack/react-query';

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

export function useSubmitReview() {
  return async (cardId: string, grade: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    const response = await fetch('/api/v1/study/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, grade }),
    });
    if (!response.ok) {
      throw new Error('Review submission failed');
    }
    return response.json();
  };
}
