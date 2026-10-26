'use client';

import { useCallback, useEffect, useRef } from 'react';
import { autoAdvanceDelayMs } from '@/features/study/lib/answer-feedback';
import { isImeComposing } from '@/lib/utils/keyboard';
import { isTextEntryElement } from '@/lib/utils/touch';

export type UseAnswerAutoAdvanceOptions = {
  /** `null` while the question is unanswered; otherwise whether the answer was correct. */
  result: boolean | null;
  /** Moves to the next question (or finishes the round). Called at most once per answer. */
  onAdvance: () => void;
  /** Override the default 1s / 5s delay (e.g. Draw mode keeps its stroke hint longer). */
  delayMs?: number;
  /** Advance on Enter while feedback is showing. Defaults to true. */
  enterToAdvance?: boolean;
};

export type UseAnswerAutoAdvanceResult = {
  /** Skip the remaining wait — wire to the Continue button. */
  advanceNow: () => void;
};

/**
 * Shared "answer feedback → auto-advance" behaviour for study modes:
 * correct answers advance after 1s, incorrect after 5s, and Continue / Enter
 * advances immediately. Guards against double-advancing (timer + click).
 */
export function useAnswerAutoAdvance({
  result,
  onAdvance,
  delayMs,
  enterToAdvance = true,
}: UseAnswerAutoAdvanceOptions): UseAnswerAutoAdvanceResult {
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  const isAdvancingRef = useRef(false);

  const advanceNow = useCallback(() => {
    if (isAdvancingRef.current) {
      return;
    }
    isAdvancingRef.current = true;
    onAdvanceRef.current();
  }, []);

  useEffect(() => {
    if (result === null) {
      isAdvancingRef.current = false;
      return;
    }

    const timerId = window.setTimeout(advanceNow, delayMs ?? autoAdvanceDelayMs(result));
    return () => {
      window.clearTimeout(timerId);
    };
  }, [result, delayMs, advanceNow]);

  useEffect(() => {
    if (result === null || !enterToAdvance) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || isImeComposing(event)) {
        return;
      }
      // Enter in another field (e.g. the guide chat) belongs to that field.
      if (event.target instanceof Element && isTextEntryElement(event.target)) {
        return;
      }
      event.preventDefault();
      advanceNow();
    };
    // Register on the next tick: the Enter that submitted the answer is still
    // bubbling to `window` when this effect runs, and must not also advance.
    const armId = window.setTimeout(() => window.addEventListener('keydown', onKeyDown), 0);
    return () => {
      window.clearTimeout(armId);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [result, enterToAdvance, advanceNow]);

  return { advanceNow };
}
