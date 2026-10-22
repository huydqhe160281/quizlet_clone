/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { TestMode } from './TestMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { renderWithLocale } from '@/test/render-with-locale';

// Drive TestMode with the real store + round engine; only the network-facing
// parts of the hook are stubbed.
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

// Deterministic true/false questions whose pair is always correct.
vi.mock('@/features/study/lib/test-generator', () => ({
  generateTestQuestions: (cards: { id: string; front: string; back: string }[]) =>
    cards.map((card) => ({
      type: 'tf',
      cardId: card.id,
      front: card.front,
      shownBack: card.back,
      isPairCorrect: true,
    })),
}));

const makeCards = (count: number): StudyCard[] =>
  Array.from({ length: count }, (_, i) => ({
    sessionCardId: `sc-${i}`,
    cardId: `c${i}`,
    front: `front-${i}`,
    back: `back-${i}`,
    example: null,
    imageUrl: null,
  })) as StudyCard[];

describe('TestMode round boundary', () => {
  beforeEach(() => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'TEST',
        cards: makeCards(3),
        settings: {
          randomize: false,
          cardsPerRound: 2,
          requeueWrong: true,
          presentation: 'default',
          mcDirection: 'front_to_back',
        },
      });
    });
  });

  it('keeps showing the answered question and its continue button when the next round is smaller', () => {
    renderWithLocale(<TestMode setId="set-1" />, { locale: 'en' });

    // Round 1: two cards.
    expect(screen.getByText('front-0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'True' }));
    fireEvent.click(screen.getByRole('button', { name: /Next question/ }));

    expect(screen.getByText('front-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'True' }));

    // Store has moved to round 2 (one card), but the feedback for front-1 must remain.
    expect(useStudyStore.getState().currentRound).toEqual(['c2']);
    expect(screen.getByText('front-1')).toBeInTheDocument();
    expect(screen.queryByText('front-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next round/ }));
    // Round summary, then round 2.
    fireEvent.click(screen.getByRole('button', { name: /Next round|Continue|Start/ }));
    expect(screen.getByText('front-2')).toBeInTheDocument();
  });
});
