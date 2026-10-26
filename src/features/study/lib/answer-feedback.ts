import { playCorrectFeedbackSound } from '@/features/study/lib/study-feedback-sound';
import { useStudyPreferences } from '@/features/study/stores/study-preferences';

/** Brief pause so correct-answer feedback is visible before auto-advance. */
export const CORRECT_AUTO_ADVANCE_MS = 1000;
/** Longer pause on incorrect answers; Continue / Enter still advances immediately. */
export const INCORRECT_AUTO_ADVANCE_MS = 5000;

/** Auto-advance delay for an answer result. */
export function autoAdvanceDelayMs(isCorrect: boolean): number {
  return isCorrect ? CORRECT_AUTO_ADVANCE_MS : INCORRECT_AUTO_ADVANCE_MS;
}

/** Plays the correct-answer chime when the learner has sound enabled. Silent on incorrect. */
export function playAnswerFeedback(isCorrect: boolean): void {
  if (!isCorrect || !useStudyPreferences.getState().soundEnabled) {
    return;
  }
  playCorrectFeedbackSound();
}
