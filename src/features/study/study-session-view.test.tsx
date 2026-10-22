/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { useShallow } from 'zustand/react/shallow';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { selectStudySessionView, useStudyStore } from '@/features/study/store';

const cards = ['c1', 'c2'].map((cardId) => ({
  sessionCardId: `s-${cardId}`,
  cardId,
  front: cardId,
  back: 'b',
  example: null,
  imageUrl: null,
}));

describe('study session view subscription', () => {
  beforeEach(() => {
    useStudyStore.getState().reset();
    useStudyStore
      .getState()
      .initSession({ sessionId: 'sess-1', setId: 'set-1', mode: 'LEARN', cards });
  });

  afterEach(() => {
    cleanup();
    useStudyStore.getState().reset();
  });

  it('does not re-render when only the answer buffer changes', () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useStudyStore(useShallow(selectStudySessionView));
    });
    const before = renders;

    act(() => {
      useStudyStore.getState().addPendingAnswer('c1', true);
      useStudyStore.getState().clearPendingAnswers();
    });

    expect(renders).toBe(before);
  });

  it('re-renders when something the mode shows changes', () => {
    const { result } = renderHook(() => useStudyStore(useShallow(selectStudySessionView)));

    act(() => {
      useStudyStore.getState().setError('boom');
    });

    expect(result.current.error).toBe('boom');
    expect('pendingAnswers' in result.current).toBe(false);
  });
});
