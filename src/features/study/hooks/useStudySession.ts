'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudyModeValue, StudySessionSettings } from '@/features/study/schemas/study.schema';
import { studySessionSettingsSchema } from '@/features/study/schemas/study.schema';
import { useStudyStore, type StudyCard } from '@/stores/study.store';

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
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, mode, sessionIdFromQuery]);

  const recordAnswer = async (cardId: string, isCorrect: boolean) => {
    if (!store.sessionId) {
      return;
    }
    await fetch(`/api/v1/study/sessions/${store.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, isCorrect }),
    });
  };

  const completeSession = async (correctCountOverride?: number) => {
    if (!store.sessionId) {
      return;
    }
    await fetch(`/api/v1/study/sessions/${store.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctCount: correctCountOverride ?? store.correctCount,
      }),
    });
  };

  return { ...store, recordAnswer, completeSession };
}
