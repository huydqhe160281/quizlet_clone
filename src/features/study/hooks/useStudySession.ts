'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudyModeValue, StudySessionSettings } from '@/features/study/schemas/study.schema';
import { studySessionSettingsSchema } from '@/features/study/schemas/study.schema';
import {
  createStudySessionOnce,
  type CreatedStudySession,
} from '@/features/study/lib/create-session-once';
import { notifyStreakUpdated, type StreakUpdatedDetail } from '@/lib/streak/streak-client';
import { useStudyStore, type StudyCard } from '@/features/study/store';

type SessionResponse = CreatedStudySession;

type SessionWithStreakResponse = {
  data: SessionResponse;
  streak?: StreakUpdatedDetail;
};

async function flushSessionAnswers(
  sessionId: string,
  answers: Array<{ cardId: string; isCorrect: boolean }>
) {
  if (answers.length === 0) return;
  const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) {
    throw new Error(`Failed to flush session answers (${response.status})`);
  }
}

async function persistSessionCompletion(
  sessionId: string,
  correctCount: number,
  answers: Array<{ cardId: string; isCorrect: boolean }>
) {
  const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correctCount,
      answers: answers.length > 0 ? answers : undefined,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to complete session (${response.status})`);
  }

  const payload = (await response.json()) as { streak?: StreakUpdatedDetail };
  if (payload.streak) {
    notifyStreakUpdated(payload.streak);
  }
}

export function useStudySession(setId: string, mode: StudyModeValue) {
  const store = useStudyStore();
  const searchParams = useSearchParams();
  const sessionIdFromQuery = searchParams.get('sessionId');
  const completionSentRef = useRef<string | null>(null);
  const flushedRoundCountRef = useRef(0);

  useEffect(() => {
    let active = true;

    const startSession = async () => {
      store.setLoading(true);
      store.setError(null);
      completionSentRef.current = null;
      flushedRoundCountRef.current = 0;

      let sessionData: SessionResponse;

      if (sessionIdFromQuery) {
        const response = await fetch(`/api/v1/study/sessions/${sessionIdFromQuery}`);
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          if (active) {
            store.setError(payload.message ?? 'Failed to load session');
            store.setLoading(false);
          }
          return;
        }
        const payload = (await response.json()) as SessionWithStreakResponse;
        sessionData = payload.data;
        if (active && payload.streak) {
          notifyStreakUpdated(payload.streak);
        }
      } else {
        try {
          // Shared cache prevents React Strict Mode from creating 2 DB rows.
          const payload = await createStudySessionOnce(setId, mode);
          sessionData = payload.data;
          if (active && payload.streak) {
            notifyStreakUpdated(payload.streak);
          }
        } catch (error) {
          if (active) {
            store.setError(error instanceof Error ? error.message : 'Failed to start session');
            store.setLoading(false);
          }
          return;
        }
      }

      const cards: StudyCard[] = sessionData.sessionCards.map((item) => ({
        sessionCardId: item.id,
        cardId: item.cardId,
        front: item.card.front,
        back: item.card.back,
        example: item.card.example,
        imageUrl: item.card.imageUrl,
      }));

      let settings: StudySessionSettings | null = null;
      if (sessionData.settings !== undefined && sessionData.settings !== null) {
        const parsed = studySessionSettingsSchema.safeParse(sessionData.settings);
        settings = parsed.success ? parsed.data : null;
      }

      if (active) {
        store.initSession({
          sessionId: sessionData.id,
          setId,
          mode,
          cards,
          settings,
        });
      }
    };

    void startSession();

    return () => {
      active = false;
      const state = useStudyStore.getState();
      const {
        sessionId,
        pendingAnswers,
        isComplete,
        correctCount,
        reviewedCount,
        mode: sessionMode,
      } = state;

      // If the run finished but PATCH never left (UI showed complete early), persist now.
      if (sessionId && isComplete && completionSentRef.current !== sessionId) {
        completionSentRef.current = sessionId;
        const count = sessionMode === 'FLASHCARD' ? reviewedCount : correctCount;
        void persistSessionCompletion(sessionId, count, pendingAnswers);
        useStudyStore.getState().clearPendingAnswers();
      } else if (sessionId && pendingAnswers.length > 0) {
        navigator.sendBeacon(
          `/api/v1/study/sessions/${sessionId}`,
          new Blob([JSON.stringify({ answers: pendingAnswers })], {
            type: 'application/json',
          })
        );
      }
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, mode, sessionIdFromQuery]);

  useEffect(() => {
    const flushBeacon = () => {
      const { sessionId, pendingAnswers } = useStudyStore.getState();
      if (!sessionId || pendingAnswers.length === 0) return;
      navigator.sendBeacon(
        `/api/v1/study/sessions/${sessionId}`,
        new Blob([JSON.stringify({ answers: pendingAnswers })], {
          type: 'application/json',
        })
      );
      useStudyStore.getState().clearPendingAnswers();
    };

    const onBeforeUnload = () => flushBeacon();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushBeacon();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [store.sessionId]);

  /** After each finished round, flush answers so Dashboard can show partial progress. */
  useEffect(() => {
    if (!store.sessionId || store.isComplete) return;
    if (store.roundResults.length <= flushedRoundCountRef.current) return;
    if (completionSentRef.current === store.sessionId) return;

    flushedRoundCountRef.current = store.roundResults.length;
    const { sessionId, pendingAnswers } = useStudyStore.getState();
    if (!sessionId || pendingAnswers.length === 0) return;

    useStudyStore.getState().clearPendingAnswers();
    void flushSessionAnswers(sessionId, pendingAnswers).catch(() => {
      // Re-queue so a later flush/complete/beacon can retry.
      pendingAnswers.forEach((answer) => {
        useStudyStore.getState().addPendingAnswer(answer.cardId, answer.isCorrect);
      });
    });
  }, [store.roundResults.length, store.sessionId, store.isComplete]);

  /** Persist completion as soon as the engine marks the run done (don't wait for a click). */
  useEffect(() => {
    if (!store.isComplete || !store.sessionId) return;
    if (completionSentRef.current === store.sessionId) return;

    completionSentRef.current = store.sessionId;
    const sessionId = store.sessionId;
    const {
      pendingAnswers,
      correctCount,
      reviewedCount,
      mode: sessionMode,
    } = useStudyStore.getState();
    useStudyStore.getState().clearPendingAnswers();
    const count = sessionMode === 'FLASHCARD' ? reviewedCount : correctCount;
    void persistSessionCompletion(sessionId, count, pendingAnswers).catch(() => {
      completionSentRef.current = null;
      pendingAnswers.forEach((answer) => {
        useStudyStore.getState().addPendingAnswer(answer.cardId, answer.isCorrect);
      });
    });
  }, [store.isComplete, store.sessionId]);

  const recordAnswer = useCallback((cardId: string, isCorrect: boolean) => {
    useStudyStore.getState().addPendingAnswer(cardId, isCorrect);
  }, []);

  const completeSession = useCallback(async (correctCountOverride?: number) => {
    const state = useStudyStore.getState();
    if (!state.sessionId) return;
    if (completionSentRef.current === state.sessionId) return;

    completionSentRef.current = state.sessionId;
    const answers = state.pendingAnswers;
    state.clearPendingAnswers();
    const count =
      correctCountOverride ??
      (state.mode === 'FLASHCARD' ? state.reviewedCount : state.correctCount);
    await persistSessionCompletion(state.sessionId, count, answers);
  }, []);

  return { ...store, recordAnswer, completeSession };
}
