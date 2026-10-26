'use client';

import { create } from 'zustand';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import type { StudySessionSettings } from '@/features/study/schemas/study.schema';
import {
  initRoundEngine,
  recordAnswer as engineRecordAnswer,
  type RoundEngineState,
} from '@/features/study/lib/round-engine';
import {
  STUDY_SESSION_SETTINGS_DEFAULTS,
  LEGACY_SESSION_SETTINGS_FALLBACK,
} from '@/features/study/schemas/study.schema';
import type { StampedPendingAnswer } from '@/features/study-offline/types';

export type StudyCard = {
  sessionCardId: string;
  cardId: string;
  front: string;
  back: string;
  example: string | null;
  imageUrl: string | null;
};

export type { StampedPendingAnswer };

// ── Round-level tracking ──────────────────────────────────────────────────────
export type RoundResult = {
  roundIndex: number;
  correctInRound: number;
  totalInRound: number;
};

type StudyState = {
  sessionId: string | null;
  setId: string | null;
  mode: StudyModeValue | null;
  cards: StudyCard[];
  settings: StudySessionSettings | null;

  // Linear index (V1 compat — current card within currentRound)
  currentIndex: number;
  correctCount: number;
  reviewedCount: number;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;

  // Round engine state
  roundEngine: RoundEngineState | null;
  currentRound: string[]; // cardIds in the current round
  roundIndex: number;
  roundResults: RoundResult[]; // per-round summaries
  correctInRound: number;

  // Buffered answers — flushed to server on complete/unmount/unload
  pendingAnswers: StampedPendingAnswer[];

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initSession: (payload: {
    sessionId: string;
    setId: string;
    mode: StudyModeValue;
    cards: StudyCard[];
    settings?: StudySessionSettings | null;
  }) => void;
  /**
   * Record an answer for a cardId. Returns true if the round just completed.
   * `countAsCorrect: false` passes the card (no requeue) without adding to the
   * correct counts — used when Flashcard autoplay moves past a card.
   */
  recordRoundAnswer: (
    cardId: string,
    isCorrect: boolean,
    options?: { countAsCorrect?: boolean }
  ) => boolean;
  /** Buffer a newly recorded answer — mints clientMutationId once. */
  addPendingAnswer: (cardId: string, isCorrect: boolean) => void;
  /**
   * Prepend already-stamped answers (no remint). Used after a failed flush so
   * older answers sort ahead of any answers recorded during the in-flight window.
   */
  requeuePendingAnswers: (answers: StampedPendingAnswer[]) => void;
  clearPendingAnswers: () => void;
  nextCard: () => void;
  prevCard: () => void;
  incrementCorrect: () => void;
  incrementReviewed: () => void;
  setComplete: () => void;
  reset: () => void;
};

const initialState = {
  sessionId: null,
  setId: null,
  mode: null as StudyModeValue | null,
  cards: [] as StudyCard[],
  settings: null as StudySessionSettings | null,
  currentIndex: 0,
  correctCount: 0,
  reviewedCount: 0,
  isComplete: false,
  isLoading: true,
  error: null as string | null,
  roundEngine: null as RoundEngineState | null,
  currentRound: [] as string[],
  roundIndex: 0,
  roundResults: [] as RoundResult[],
  correctInRound: 0,
  pendingAnswers: [] as StampedPendingAnswer[],
};

/**
 * What study mode UIs render. Leaves out the answer buffer and raw engine state, which
 * change on every answer/flush but are only read through `getState()`, so subscribing
 * to this view (with `useShallow`) skips those re-renders.
 */
export function selectStudySessionView(state: StudyState) {
  const { pendingAnswers, roundEngine, ...view } = state;
  void pendingAnswers;
  void roundEngine;
  return view;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  ...initialState,

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  initSession: ({ sessionId, setId, mode, cards, settings }) => {
    const cardIds = cards.map((c) => c.cardId);
    const totalCards = cards.length;

    // Resolve effective settings (null → legacy fallback, undefined → defaults)
    let effectiveSettings: StudySessionSettings;
    if (settings === null || settings === undefined) {
      // Legacy session: null settings → V1 behaviour (all cards, no requeue)
      effectiveSettings = {
        ...STUDY_SESSION_SETTINGS_DEFAULTS,
        ...LEGACY_SESSION_SETTINGS_FALLBACK,
        cardsPerRound: totalCards,
        // V1 flashcards had no "Still learning" answer; those cards must still come back.
        ...(mode === 'FLASHCARD' ? { requeueWrong: true } : {}),
      };
    } else {
      effectiveSettings = settings;
    }

    const roundEngine = initRoundEngine(cardIds, {
      randomize: effectiveSettings.randomize,
      cardsPerRound: effectiveSettings.cardsPerRound,
      requeueWrong: effectiveSettings.requeueWrong,
    });

    set({
      ...initialState,
      sessionId,
      setId,
      mode,
      cards,
      settings: effectiveSettings,
      isLoading: false,
      roundEngine,
      currentRound: roundEngine.currentRound,
      roundIndex: roundEngine.roundIndex,
    });
  },

  recordRoundAnswer: (cardId, isCorrect, { countAsCorrect = isCorrect } = {}) => {
    const { roundEngine, roundResults, roundIndex, correctInRound } = get();
    if (!roundEngine) return false;

    if (isCorrect && countAsCorrect) {
      set({ correctCount: get().correctCount + 1, correctInRound: correctInRound + 1 });
    }
    set({ reviewedCount: get().reviewedCount + 1 });

    const { state: nextEngine, roundComplete } = engineRecordAnswer(roundEngine, cardId, isCorrect);

    if (roundComplete) {
      const summary: RoundResult = {
        roundIndex,
        correctInRound: get().correctInRound,
        totalInRound: roundEngine.currentRound.length,
      };
      set({
        roundEngine: nextEngine,
        currentRound: nextEngine.currentRound,
        roundIndex: nextEngine.roundIndex,
        roundResults: [...roundResults, summary],
        correctInRound: 0,
        currentIndex: 0,
        isComplete: nextEngine.isRunComplete,
      });
    } else {
      set({ roundEngine: nextEngine });
    }

    return roundComplete;
  },

  addPendingAnswer: (cardId, isCorrect) => {
    set((state) => ({
      pendingAnswers: [
        ...state.pendingAnswers,
        {
          cardId,
          isCorrect,
          clientMutationId: crypto.randomUUID(),
          clientTimestamp: Date.now(),
        },
      ],
    }));
  },
  requeuePendingAnswers: (answers) => {
    set((state) => ({
      pendingAnswers: [...answers, ...state.pendingAnswers],
    }));
  },
  clearPendingAnswers: () => set({ pendingAnswers: [] }),

  nextCard: () => {
    const { currentIndex, currentRound } = get();
    if (currentIndex >= currentRound.length - 1) {
      set({ isComplete: true });
      return;
    }
    set({ currentIndex: currentIndex + 1 });
  },
  prevCard: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },
  incrementCorrect: () => set((state) => ({ correctCount: state.correctCount + 1 })),
  incrementReviewed: () => set((state) => ({ reviewedCount: state.reviewedCount + 1 })),
  setComplete: () => set({ isComplete: true }),
  reset: () => set(initialState),
}));
