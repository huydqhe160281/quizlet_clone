/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { LearnMode } from './learn/LearnMode';
import { WriteMode } from './write/WriteMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import type { StudyModeValue } from '@/features/study/schemas/study.schema';
import { renderWithLocale } from '@/test/render-with-locale';

// Real store + round engine; only network-facing hook parts are stubbed.
vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({
      ...store(),
      recordAnswer: vi.fn(),
      completeSession: vi.fn(),
    }),
  };
});

vi.mock('@/features/study/lib/study-feedback-sound', () => ({
  playCorrectFeedbackSound: vi.fn(),
}));

const cards = Array.from({ length: 3 }, (_, i) => ({
  sessionCardId: `sc-${i}`,
  cardId: `c${i}`,
  front: `question-${i}`,
  back: `answer-${i}`,
  example: null,
  imageUrl: null,
})) as StudyCard[];

function init(mode: StudyModeValue) {
  act(() => {
    useStudyStore.getState().initSession({
      sessionId: 'session-1',
      setId: 'set-1',
      mode,
      cards,
      settings: {
        randomize: false,
        cardsPerRound: 2,
        requeueWrong: true,
        presentation: 'default',
        mcDirection: 'front_to_back',
      },
    });
  });
}

function typeAndCheck(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
}

describe('study modes keep the answered card through the round boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('Learn: feedback for the last card of a round still shows that card', () => {
    init('LEARN');
    renderWithLocale(<LearnMode setId="set-1" />, { locale: 'en' });

    typeAndCheck('answer-0');
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    // Correct, so round 2 holds only question-2 (no remediation of question-1).
    typeAndCheck('answer-1');

    // Round 2 is already active in the store, but the prompt must not jump ahead.
    expect(useStudyStore.getState().roundIndex).toBe(1);
    expect(screen.getByText('question-1')).toBeInTheDocument();
    expect(screen.queryByText('question-2')).not.toBeInTheDocument();
  });

  it('Write: feedback for the last card of a round still shows that card', () => {
    init('WRITE');
    renderWithLocale(<WriteMode setId="set-1" />, { locale: 'en' });

    typeAndCheck('answer-0');
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typeAndCheck('answer-1');

    expect(useStudyStore.getState().roundIndex).toBe(1);
    expect(screen.getByText('question-1')).toBeInTheDocument();
    expect(screen.queryByText('question-2')).not.toBeInTheDocument();
  });
});
