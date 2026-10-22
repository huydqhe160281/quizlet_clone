import type { QueryClient } from '@tanstack/react-query';
import { todayKeys } from '@/features/today/query-keys';

/** Fired after study progress reaches the server (session complete, SRS review, replay). */
export const STUDY_ACTIVITY_EVENT = 'study-activity-recorded';

/** Query keys whose data depends on study progress (goal, queue, due list). */
export const STUDY_ACTIVITY_QUERY_KEYS = [todayKeys.all, ['study', 'due-cards']] as const;

export function notifyStudyActivity() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STUDY_ACTIVITY_EVENT));
}

/** Mark progress-derived queries stale so /today and the due list do not show pre-study data. */
export function invalidateStudyActivityQueries(queryClient: QueryClient) {
  for (const queryKey of STUDY_ACTIVITY_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
