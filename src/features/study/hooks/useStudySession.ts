'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudyModeValue, StudySessionSettings } from '@/features/study/schemas/study.schema';
import { studySessionSettingsSchema } from '@/features/study/schemas/study.schema';
import { useStudyStore, type StudyCard } from '@/features/study/store';

type SessionCardResponse = {
  id: string;
  cardId: string;
  card: {
    front: string;
    back: string;
    example: string | null;
    imageUrl: string | null;
  };
};

type SessionResponse = {
  id: string;
  settings?: unknown;
  sessionCards: SessionCardResponse[];
};

export function useStudySession(setId: string, mode: StudyModeValue) {
  const store = useStudyStore();
  const searchParams = useSearchParams();
  // sessionId from URL query param — e.g. /sets/[setId]/flashcard?sessionId=clxxx
  const sessionIdFromQuery = searchParams.get('sessionId');

  useEffect(() => {
    let active = true;

    const startSession = async () => {
      store.setLoading(true);
      store.setError(null);

      let sessionData: SessionResponse;

      if (sessionIdFromQuery) {
        // ── Session already created by StudySettingsPage — fetch existing ──
        const response = await fetch(`/api/v1/study/sessions/${sessionIdFromQuery}`);
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          if (active) {
            store.setError(payload.message ?? 'Failed to load session');
            store.setLoading(false);
          }
          return;
        }
        const { data } = (await response.json()) as { data: SessionResponse };
        sessionData = data;
      } else {
        // ── No sessionId — auto-create session (V1 backward-compat path) ──
        const response = await fetch('/api/v1/study/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId, mode }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          if (active) {
            store.setError(payload.message ?? 'Failed to start session');
            store.setLoading(false);
          }
          return;
        }
        const { data } = (await response.json()) as { data: SessionResponse };
        sessionData = data;
      }

      const cards: StudyCard[] = sessionData.sessionCards.map((item) => ({
        sessionCardId: item.id,
        cardId: item.cardId,
        front: item.card.front,
        back: item.card.back,
        example: item.card.example,
        imageUrl: item.card.imageUrl,
      }));

      // Parse settings from session (null for legacy sessions)
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
      // Flush pending answers via sendBeacon before store is wiped
      const { sessionId, pendingAnswers } = store;
      if (sessionId && pendingAnswers.length > 0) {
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

  // Flush via sendBeacon on tab hide / browser close (fire-and-forget, survives unload)
  useEffect(() => {
    const flushBeacon = () => {
      const { sessionId, pendingAnswers } = store;
      if (!sessionId || pendingAnswers.length === 0) return;
      navigator.sendBeacon(
        `/api/v1/study/sessions/${sessionId}`,
        new Blob([JSON.stringify({ answers: pendingAnswers })], {
          type: 'application/json',
        })
      );
      store.clearPendingAnswers();
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
    // store object reference is stable (Zustand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionId]);

  /** Buffer answer locally — no network call. Flushed on complete/unmount/unload. */
  const recordAnswer = useCallback(
    (cardId: string, isCorrect: boolean) => {
      store.addPendingAnswer(cardId, isCorrect);
    },
    [store]
  );

  const completeSession = useCallback(
    async (correctCountOverride?: number) => {
      if (!store.sessionId) return;
      const answers = store.pendingAnswers;
      store.clearPendingAnswers();
      await fetch(`/api/v1/study/sessions/${store.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctCount: correctCountOverride ?? store.correctCount,
          answers: answers.length > 0 ? answers : undefined,
        }),
      });
    },
    [store]
  );

  return { ...store, recordAnswer, completeSession };
}
