/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FlashcardMode } from './FlashcardMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { renderWithLocale } from '@/test/render-with-locale';

const recordAnswer = vi.hoisted(() => vi.fn());
// onSwipe handlers in render order — lets a test fire a swipe that started on an older card.
const swipeHandlers = vi.hoisted(() => [] as Array<(direction: 'left' | 'right') => void>);

vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({ ...store(), recordAnswer, completeSession: vi.fn(async () => {}) }),
  };
});

vi.mock('@/features/study/lib/study-feedback-sound', () => ({
  playCorrectFeedbackSound: vi.fn(),
}));

vi.mock('@/features/study/components/flashcard/SwipeableCard', () => ({
  SwipeableCard: ({
    onSwipe,
    children,
  }: {
    onSwipe: (direction: 'left' | 'right') => void;
    children: (props: { guardClick: (handler: () => void) => () => void }) => ReactNode;
  }) => {
    swipeHandlers.push(onSwipe);
    return <div>{children({ guardClick: (handler) => handler })}</div>;
  },
}));

const cards = [0, 1, 2].map((i) => ({
  sessionCardId: `sc-${i}`,
  cardId: `c${i}`,
  front: `card ${i}`,
  back: `back ${i}`,
  example: null,
  imageUrl: null,
})) as StudyCard[];

describe('FlashcardMode swipe fly-out race', () => {
  afterEach(() => {
    cleanup();
    useStudyStore.getState().reset();
    swipeHandlers.length = 0;
    recordAnswer.mockClear();
  });

  it('ignores a swipe that lands after a key already answered the same card', async () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards,
        settings: {
          randomize: false,
          cardsPerRound: 3,
          requeueWrong: true,
          presentation: 'default',
          mcDirection: 'front_to_back',
        },
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });
    const swipeOnFirstCard = swipeHandlers.at(-1)!;

    // ArrowRight answers card 0 while its swipe fly-out is still animating…
    await act(async () => {
      fireEvent.keyDown(window, { code: 'ArrowRight' });
    });
    expect(screen.getByText('card 1')).toBeInTheDocument();

    // …then the fly-out finishes and reports the swipe for card 0.
    await act(async () => {
      swipeOnFirstCard('left');
    });

    expect(recordAnswer).toHaveBeenCalledTimes(1);
    expect(recordAnswer).toHaveBeenCalledWith('c0', true);
    expect(useStudyStore.getState().currentIndex).toBe(1);
    expect(screen.getByText('card 1')).toBeInTheDocument();
  });
});
