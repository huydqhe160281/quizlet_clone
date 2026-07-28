'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayKeys } from '@/features/today/query-keys';
import type { TodayPlan } from '@/features/today/types';

async function fetchTodayPlan(): Promise<TodayPlan> {
  const response = await fetch('/api/v1/today');
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Failed to load today plan');
  }
  return response.json() as Promise<TodayPlan>;
}

export function useTodayPlan() {
  return useQuery({
    queryKey: todayKeys.plan(),
    queryFn: fetchTodayPlan,
  });
}

export function useUpdateStudyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dailyGoalCards: number) => {
      const response = await fetch('/api/v1/user/study-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalCards }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Failed to update goal');
      }
      return response.json() as Promise<{ dailyGoalCards: number }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todayKeys.plan() });
    },
  });
}
