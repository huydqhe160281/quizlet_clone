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

export type StudyCard = {
  sessionCardId: string;
  cardId: string;
  front: string;
  back: string;
  example: string | null;
  imageUrl: string | null;
};

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
  /** Record an answer for a cardId. Returns true if the round just completed. */
  recordRoundAnswer: (cardId: string, isCorrect: boolean) => boolean;
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
};

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

  recordRoundAnswer: (cardId, isCorrect) => {
    const { roundEngine, roundResults, roundIndex, correctInRound } = get();
    if (!roundEngine) return false;

    if (isCorrect) {
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
