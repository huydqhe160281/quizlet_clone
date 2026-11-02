import type { QueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/query-keys';

/** Fired after study progress reaches the server (session complete, SRS review, replay). */
export const STUDY_ACTIVITY_EVENT = 'study-activity-recorded';

/** Query keys whose data depends on study progress (due list, review budget). */
export const STUDY_ACTIVITY_QUERY_KEYS = [['study', 'due-cards'], authKeys.me()] as const;

export function notifyStudyActivity() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STUDY_ACTIVITY_EVENT));
}

/** Mark progress-derived queries stale so the due list and review budget do not show pre-study data. */
export function invalidateStudyActivityQueries(queryClient: QueryClient) {
  for (const queryKey of STUDY_ACTIVITY_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
