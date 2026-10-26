/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { useAnswerAutoAdvance } from './useAnswerAutoAdvance';
import {
  CORRECT_AUTO_ADVANCE_MS,
  INCORRECT_AUTO_ADVANCE_MS,
  autoAdvanceDelayMs,
  playAnswerFeedback,
} from '@/features/study/lib/answer-feedback';
import { useStudyPreferences } from '@/features/study/stores/study-preferences';

const playCorrectMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/study/lib/study-feedback-sound', () => ({
  playCorrectFeedbackSound: playCorrectMock,
}));

describe('useAnswerAutoAdvance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playCorrectMock.mockClear();
    useStudyPreferences.setState({ soundEnabled: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances after 1s on correct answers and 5s on incorrect answers', () => {
    expect(autoAdvanceDelayMs(true)).toBe(CORRECT_AUTO_ADVANCE_MS);
    expect(autoAdvanceDelayMs(false)).toBe(INCORRECT_AUTO_ADVANCE_MS);

    const onAdvance = vi.fn();
    const { rerender } = renderHook(
      ({ result }: { result: boolean | null }) => useAnswerAutoAdvance({ result, onAdvance }),
      { initialProps: { result: null as boolean | null } }
    );

    rerender({ result: true });
    act(() => {
      vi.advanceTimersByTime(CORRECT_AUTO_ADVANCE_MS - 1);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);

    // Reset, then test incorrect answer (5s).
    rerender({ result: null });
    rerender({ result: false });
    act(() => {
      vi.advanceTimersByTime(INCORRECT_AUTO_ADVANCE_MS - 1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it('guards against double-advancing when advanceNow is clicked before timer expires', () => {
    const onAdvance = vi.fn();
    const { result } = renderHook(() => useAnswerAutoAdvance({ result: false, onAdvance }));

    act(() => {
      result.current.advanceNow();
      result.current.advanceNow();
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(INCORRECT_AUTO_ADVANCE_MS);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('advances on Enter after the submitting Enter has finished bubbling', () => {
    const onAdvance = vi.fn();
    renderHook(() => useAnswerAutoAdvance({ result: false, onAdvance }));

    // Same-tick Enter (simulating the keydown that submitted the answer) is ignored.
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('leaves Enter alone when typing in another field or confirming an IME conversion', () => {
    const onAdvance = vi.fn();
    renderHook(() => useAnswerAutoAdvance({ result: false, onAdvance }));
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const chatInput = document.createElement('input');
    document.body.appendChild(chatInput);
    try {
      const notPrevented = fireEvent.keyDown(chatInput, { key: 'Enter' });
      expect(notPrevented).toBe(true);
      fireEvent.keyDown(window, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(window, { key: 'Process', keyCode: 229 });
      expect(onAdvance).not.toHaveBeenCalled();
    } finally {
      chatInput.remove();
    }
  });
});

describe('playAnswerFeedback & study preferences', () => {
  beforeEach(() => {
    playCorrectMock.mockClear();
    useStudyPreferences.setState({ soundEnabled: true });
  });

  it('plays sound only when answer is correct and soundEnabled is true', () => {
    playAnswerFeedback(false);
    expect(playCorrectMock).not.toHaveBeenCalled();

    playAnswerFeedback(true);
    expect(playCorrectMock).toHaveBeenCalledTimes(1);

    useStudyPreferences.getState().setSoundEnabled(false);
    playAnswerFeedback(true);
    expect(playCorrectMock).toHaveBeenCalledTimes(1);
  });
});
