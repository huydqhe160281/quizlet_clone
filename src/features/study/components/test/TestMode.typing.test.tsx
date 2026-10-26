/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { TestMode } from './TestMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { renderWithLocale } from '@/test/render-with-locale';

const recordAnswer = vi.hoisted(() => vi.fn());

vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({ ...store(), recordAnswer, completeSession: vi.fn() }),
  };
});

vi.mock('@/features/study/lib/study-feedback-sound', () => ({
  playCorrectFeedbackSound: vi.fn(),
}));

// Typing questions only.
vi.mock('@/features/study/lib/test-generator', () => ({
  generateTestQuestions: (cards: { id: string; front: string; back: string }[]) =>
    cards.map((card) => ({ type: 'typing', cardId: card.id, front: card.front, back: card.back })),
}));

const cards = [
  {
    sessionCardId: 'sc-0',
    cardId: 'c0',
    front: 'ア',
    back: 'a',
    example: null,
    imageUrl: null,
  },
] as StudyCard[];

describe('TestMode typing question', () => {
  beforeEach(() => {
    act(() => {
      useStudyStore
        .getState()
        .initSession({ sessionId: 's1', setId: 'set-1', mode: 'TEST', cards });
    });
  });

  afterEach(() => {
    cleanup();
    useStudyStore.getState().reset();
    recordAnswer.mockClear();
  });

  it('does not submit on the Enter that confirms an IME conversion', () => {
    renderWithLocale(<TestMode setId="set-1" />, { locale: 'en' });
    const input = screen.getByPlaceholderText(/answer/i);
    fireEvent.change(input, { target: { value: 'あ' } });

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(recordAnswer).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(recordAnswer).toHaveBeenCalledWith('c0', false);
  });
});
