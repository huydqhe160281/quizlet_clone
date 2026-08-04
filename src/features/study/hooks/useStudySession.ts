'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { StudyModeValue, StudySessionSettings } from '@/features/study/schemas/study.schema';
import { studySessionSettingsSchema } from '@/features/study/schemas/study.schema';
import {
  createStudySessionOnce,
  type CreatedStudySession,
} from '@/features/study/lib/create-session-once';
import { notifyStreakUpdated, type StreakUpdatedDetail } from '@/lib/streak/streak-client';
import { useStudyStore, type StudyCard, type StampedPendingAnswer } from '@/features/study/store';
import { getCachedSet, upsertCachedSet } from '@/features/study-offline/cache';
import {
  enqueueMutation,
  enqueueSessionAnswers,
  findPendingSessionCompleteId,
} from '@/features/study-offline/queue';

type SessionResponse = CreatedStudySession;

type SessionWithStreakResponse = {
  data: SessionResponse;
  streak?: StreakUpdatedDetail;
};

class SessionAlreadyCompletedError extends Error {
  constructor() {
    super('session_already_completed');
    this.name = 'SessionAlreadyCompletedError';
  }
}

function isSessionAlreadyCompleted(error: unknown): boolean {
  return (
    error instanceof SessionAlreadyCompletedError ||
    (error instanceof Error && error.name === 'SessionAlreadyCompletedError')
  );
}

const noopRequeueFallback = {
  requeuePendingAnswers: () => undefined,
};

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function flushSessionAnswers(sessionId: string, answers: StampedPendingAnswer[]) {
  if (answers.length === 0) return;
  const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: answers.map((answer) => ({
        cardId: answer.cardId,
        isCorrect: answer.isCorrect,
        clientMutationId: answer.clientMutationId,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to flush session answers (${response.status})`);
  }
  const payload = await readJsonSafe<{ data?: { recorded?: number; reason?: string } }>(response);
  if (payload?.data?.reason === 'session_already_completed') {
    throw new SessionAlreadyCompletedError();
  }
}

async function persistSessionCompletion(
  sessionId: string,
  correctCount: number,
  answers: StampedPendingAnswer[],
  clientMutationId: string
) {
  const response = await fetch(`/api/v1/study/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correctCount,
      answers:
        answers.length > 0
          ? answers.map((answer) => ({
              cardId: answer.cardId,
              isCorrect: answer.isCorrect,
              clientMutationId: answer.clientMutationId,
            }))
          : undefined,
      clientMutationId,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to complete session (${response.status})`);
  }

  const payload = await readJsonSafe<{
    streak?: StreakUpdatedDetail;
    alreadyCompleted?: boolean;
  }>(response);
  if (payload?.alreadyCompleted === true) {
    throw new SessionAlreadyCompletedError();
  }
  if (payload?.streak) {
    notifyStreakUpdated(payload.streak);
  }
}

function ensureCompletionMutationId(ref: { current: string | null }): string {
  if (!ref.current) {
    ref.current = crypto.randomUUID();
  }
  return ref.current;
}

function toBeaconBlob(answers: StampedPendingAnswer[]) {
  return new Blob(
    [
      JSON.stringify({
        answers: answers.map((answer) => ({
          cardId: answer.cardId,
          isCorrect: answer.isCorrect,
          clientMutationId: answer.clientMutationId,
        })),
      }),
    ],
    { type: 'application/json' }
  );
}

export function useStudySession(setId: string, mode: StudyModeValue) {
  const store = useStudyStore();
  const searchParams = useSearchParams();
  const sessionIdFromQuery = searchParams.get('sessionId');
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id;
  const userIdRef = useRef<string | undefined>(userId);
  const completionSentRef = useRef<string | null>(null);
  const completionClientMutationIdRef = useRef<string | null>(null);
  const flushedRoundCountRef = useRef(0);
  const mountedRef = useRef(true);
  const activeSessionIdRef = useRef<string | null>(null);
  const cacheMetaRef = useRef<{
    sessionId: string;
    setTitle: string;
    cards: StudyCard[];
  } | null>(null);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Upsert cache once auth resolves — never remount the study session for userId.
  useEffect(() => {
    if (!userId) return;
    const meta = cacheMetaRef.current;
    if (!meta) return;
    void upsertCachedSet(userId, setId, meta.sessionId, meta.setTitle, meta.cards);
  }, [userId, setId]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;

    const startSession = async () => {
      store.setLoading(true);
      store.setError(null);
      completionSentRef.current = null;
      completionClientMutationIdRef.current = null;
      flushedRoundCountRef.current = 0;
      activeSessionIdRef.current = null;

      let sessionData: SessionResponse;

      if (sessionIdFromQuery) {
        try {
          const response = await fetch(`/api/v1/study/sessions/${sessionIdFromQuery}`);
          if (!response.ok) {
            let message = 'Failed to load session';
            try {
              const payload = (await response.json()) as { message?: string };
              message = payload.message ?? message;
            } catch {
              // Non-JSON error body — still a real HTTP failure, never cache-fallback.
            }
            if (active) {
              store.setError(message);
              store.setLoading(false);
            }
            return;
          }
          const payload = (await response.json()) as SessionWithStreakResponse;
          sessionData = payload.data;
          if (active && payload.streak) {
            notifyStreakUpdated(payload.streak);
          }
        } catch {
          // Network throw only — HTTP !ok never reaches here.
          const uid = userIdRef.current;
          if (!uid) {
            if (active) {
              store.setError('Failed to load session');
              store.setLoading(false);
            }
            return;
          }
          const cached = await getCachedSet(uid, setId);
          if (!cached || cached.sessionId !== sessionIdFromQuery) {
            if (active) {
              store.setError('Failed to load session');
              store.setLoading(false);
            }
            return;
          }
          sessionData = {
            id: cached.sessionId,
            sessionCards: cached.cards.map((card) => ({
              id: card.sessionCardId,
              cardId: card.cardId,
              card: {
                front: card.front,
                back: card.back,
                example: card.example,
                imageUrl: card.imageUrl,
              },
            })),
            set: { id: cached.setId, title: cached.setTitle },
          };
        }
      } else {
        try {
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

      // Aborted by cleanup (Strict Mode / dep change) — do not touch live refs/store.
      if (!active) return;

      const uid = userIdRef.current;
      if (sessionData.set) {
        cacheMetaRef.current = {
          sessionId: sessionData.id,
          setTitle: sessionData.set.title,
          cards,
        };
        if (uid) {
          void upsertCachedSet(uid, setId, sessionData.id, sessionData.set.title, cards);
        }
      }

      // Reuse durable completion id if a prior attempt already queued one.
      const queuedCompletionId = uid
        ? await findPendingSessionCompleteId(uid, sessionData.id)
        : undefined;
      if (!active) return;
      if (queuedCompletionId) {
        completionClientMutationIdRef.current = queuedCompletionId;
      }

      let settings: StudySessionSettings | null = null;
      if (sessionData.settings !== undefined && sessionData.settings !== null) {
        const parsed = studySessionSettingsSchema.safeParse(sessionData.settings);
        settings = parsed.success ? parsed.data : null;
      }

      activeSessionIdRef.current = sessionData.id;
      store.initSession({
        sessionId: sessionData.id,
        setId,
        mode,
        cards,
        settings,
      });
    };

    void startSession();

    return () => {
      active = false;
      mountedRef.current = false;
      const state = useStudyStore.getState();
      const {
        sessionId,
        pendingAnswers,
        isComplete,
        correctCount,
        reviewedCount,
        mode: sessionMode,
      } = state;
      const uid = userIdRef.current;

      if (sessionId && isComplete && completionSentRef.current !== sessionId) {
        completionSentRef.current = sessionId;
        const count = sessionMode === 'FLASHCARD' ? reviewedCount : correctCount;
        const completionId = ensureCompletionMutationId(completionClientMutationIdRef);
        void persistSessionCompletion(sessionId, count, pendingAnswers, completionId).catch(
          (error: unknown) => {
            if (!uid || isSessionAlreadyCompleted(error)) return;
            // Unmount: IDB only — never requeue into a possibly-new live store.
            void enqueueSessionAnswers(uid, sessionId, pendingAnswers, noopRequeueFallback);
            void enqueueMutation(
              uid,
              'session-complete',
              { sessionId, correctCount: count, answers: pendingAnswers },
              completionId,
              Date.now()
            );
          }
        );
        useStudyStore.getState().clearPendingAnswers();
      } else if (sessionId && pendingAnswers.length > 0) {
        navigator.sendBeacon(`/api/v1/study/sessions/${sessionId}`, toBeaconBlob(pendingAnswers));
      }
      activeSessionIdRef.current = null;
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, mode, sessionIdFromQuery]);

  useEffect(() => {
    const flushBeacon = () => {
      const { sessionId, pendingAnswers } = useStudyStore.getState();
      if (!sessionId || pendingAnswers.length === 0) return;
      navigator.sendBeacon(`/api/v1/study/sessions/${sessionId}`, toBeaconBlob(pendingAnswers));
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

  useEffect(() => {
    if (!store.sessionId || store.isComplete) return;
    if (store.roundResults.length <= flushedRoundCountRef.current) return;
    if (completionSentRef.current === store.sessionId) return;

    flushedRoundCountRef.current = store.roundResults.length;
    const { sessionId, pendingAnswers } = useStudyStore.getState();
    if (!sessionId || pendingAnswers.length === 0) return;

    useStudyStore.getState().clearPendingAnswers();
    void flushSessionAnswers(sessionId, pendingAnswers).catch((error: unknown) => {
      if (isSessionAlreadyCompleted(error)) {
        // Server already completed — do not requeue or invent failed queue rows.
        return;
      }
      const uid = userIdRef.current;
      if (uid) {
        // Caller owns the single in-memory requeue; suppress IDB kind-aware requeue.
        void enqueueSessionAnswers(uid, sessionId, pendingAnswers, noopRequeueFallback);
      }
      if (
        mountedRef.current &&
        activeSessionIdRef.current === sessionId &&
        useStudyStore.getState().sessionId === sessionId
      ) {
        useStudyStore.getState().requeuePendingAnswers(pendingAnswers);
      }
    });
  }, [store.roundResults.length, store.sessionId, store.isComplete]);

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
    const completionId = ensureCompletionMutationId(completionClientMutationIdRef);
    void persistSessionCompletion(sessionId, count, pendingAnswers, completionId)
      .then(() => {
        completionClientMutationIdRef.current = null;
      })
      .catch((error: unknown) => {
        if (isSessionAlreadyCompleted(error)) {
          // Own or concurrent completion already applied — stop retrying.
          completionSentRef.current = sessionId;
          completionClientMutationIdRef.current = null;
          return;
        }

        completionSentRef.current = null;
        const uid = userIdRef.current;
        const stillSameLiveSession =
          mountedRef.current &&
          activeSessionIdRef.current === sessionId &&
          useStudyStore.getState().sessionId === sessionId;

        if (uid) {
          void enqueueSessionAnswers(uid, sessionId, pendingAnswers, noopRequeueFallback);
          void enqueueMutation(
            uid,
            'session-complete',
            { sessionId, correctCount: count, answers: pendingAnswers },
            completionId,
            Date.now()
          );
        }

        // Only requeue into Zustand when this session is still the live one.
        if (stillSameLiveSession) {
          useStudyStore.getState().requeuePendingAnswers(pendingAnswers);
        }
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
    const sessionId = state.sessionId;
    const answers = state.pendingAnswers;
    state.clearPendingAnswers();
    const count =
      correctCountOverride ??
      (state.mode === 'FLASHCARD' ? state.reviewedCount : state.correctCount);
    const completionId = ensureCompletionMutationId(completionClientMutationIdRef);
    try {
      await persistSessionCompletion(sessionId, count, answers, completionId);
      completionClientMutationIdRef.current = null;
    } catch (error: unknown) {
      if (isSessionAlreadyCompleted(error)) {
        completionSentRef.current = sessionId;
        completionClientMutationIdRef.current = null;
        return;
      }

      completionSentRef.current = null;
      const uid = userIdRef.current;
      if (uid) {
        await enqueueSessionAnswers(uid, sessionId, answers, noopRequeueFallback);
        await enqueueMutation(
          uid,
          'session-complete',
          { sessionId, correctCount: count, answers },
          completionId,
          Date.now()
        );
      }
      const stillSameLiveSession =
        mountedRef.current &&
        activeSessionIdRef.current === sessionId &&
        useStudyStore.getState().sessionId === sessionId;
      if (stillSameLiveSession) {
        useStudyStore.getState().requeuePendingAnswers(answers);
      }
    }
  }, []);

  return { ...store, recordAnswer, completeSession };
}
