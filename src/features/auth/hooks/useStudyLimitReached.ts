'use client';

import { useEffect, useState } from 'react';
import { fetchAccountStatus } from '@/features/auth/hooks/useAccountStatus';
import { STUDY_ACTIVITY_EVENT } from '@/lib/study-activity';

/**
 * Whether the account has used its unverified review budget, checked when a study ends.
 * Rechecks on STUDY_ACTIVITY_EVENT because the completion request may still be in flight
 * when the completion screen mounts. Plain fetch so it works outside a query provider.
 */
export function useStudyLimitReached(): boolean {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () => {
      fetchAccountStatus()
        .then((account) => {
          if (active) setReached(account.studyLimit?.reached === true);
        })
        .catch(() => {
          // Offline or signed out: the gate on the next start still shows the notice.
        });
    };
    check();
    window.addEventListener(STUDY_ACTIVITY_EVENT, check);
    return () => {
      active = false;
      window.removeEventListener(STUDY_ACTIVITY_EVENT, check);
    };
  }, []);

  return reached;
}
