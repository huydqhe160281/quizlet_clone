'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { clearCachedSetsForUser, purgeForeignCachedSets } from '@/features/study-offline/cache';
import {
  dismissFailedMutations,
  getFailedMutations,
  getReplayableMutations,
} from '@/features/study-offline/queue';
import { replayPendingMutations } from '@/features/study-offline/replay';

type SyncCounts = {
  pending: number;
  failed: number;
  failedSessionComplete: boolean;
};

type StudyOfflineSyncContextValue = {
  counts: SyncCounts;
  lastSyncedAt: number | null;
  syncNow: () => Promise<void>;
  dismissFailed: () => Promise<void>;
  refreshCounts: () => Promise<void>;
};

const StudyOfflineSyncContext = createContext<StudyOfflineSyncContextValue | null>(null);

const emptyCounts: SyncCounts = {
  pending: 0,
  failed: 0,
  failedSessionComplete: false,
};

export function StudyOfflineSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const [counts, setCounts] = useState<SyncCounts>(emptyCounts);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const refreshCounts = useCallback(async () => {
    if (!userId) {
      setCounts(emptyCounts);
      return;
    }
    const [pendingRows, failedRows] = await Promise.all([
      getReplayableMutations(userId),
      getFailedMutations(userId),
    ]);
    setCounts({
      pending: pendingRows.length,
      failed: failedRows.length,
      failedSessionComplete: failedRows.some((row) => row.kind === 'session-complete'),
    });
  }, [userId]);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    const before = await getReplayableMutations(userId);
    await replayPendingMutations(userId);
    await refreshCounts();
    const after = await getReplayableMutations(userId);
    if (before.length > 0 && after.length === 0) {
      setLastSyncedAt(Date.now());
    }
  }, [userId, refreshCounts]);

  const dismissFailed = useCallback(async () => {
    if (!userId) return;
    await dismissFailedMutations(userId);
    await refreshCounts();
  }, [userId, refreshCounts]);

  useEffect(() => {
    if (userId) {
      lastUserIdRef.current = userId;
    }
  }, [userId]);

  useEffect(() => {
    if (status === 'authenticated' && userId) {
      void purgeForeignCachedSets(userId);
      void refreshCounts();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        void syncNow();
      }
    }
    // Mount / auth-identity only — avoid re-running when syncNow identity churns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const prior = lastUserIdRef.current;
    if (!prior) return;
    // Content-cache clear only — mutations survive sign-out.
    void clearCachedSetsForUser(prior);
    lastUserIdRef.current = undefined;
  }, [status]);

  useEffect(() => {
    if (!userId) return;

    const onOnline = () => {
      void syncNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncNow();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, syncNow]);

  return (
    <StudyOfflineSyncContext.Provider
      value={{ counts, lastSyncedAt, syncNow, dismissFailed, refreshCounts }}
    >
      {children}
    </StudyOfflineSyncContext.Provider>
  );
}

export function useStudyOfflineSync() {
  const ctx = useContext(StudyOfflineSyncContext);
  if (!ctx) {
    return {
      counts: emptyCounts,
      lastSyncedAt: null,
      syncNow: async () => undefined,
      dismissFailed: async () => undefined,
      refreshCounts: async () => undefined,
    } satisfies StudyOfflineSyncContextValue;
  }
  return ctx;
}
