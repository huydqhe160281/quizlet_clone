/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { FlashcardMode } from './FlashcardMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { useStudyPreferences } from '@/features/study/stores/study-preferences';
import { renderWithLocale } from '@/test/render-with-locale';

const completeSession = vi.hoisted(() => vi.fn(async () => {}));
const recordAnswer = vi.hoisted(() => vi.fn());
const playCorrectMock = vi.hoisted(() => vi.fn());

// Real store + round engine; only the network-facing hook parts are stubbed.
vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({ ...store(), recordAnswer, completeSession }),
  };
});

vi.mock('@/features/study/lib/study-feedback-sound', () => ({
  playCorrectFeedbackSound: playCorrectMock,
}));

const singleCard = [
  {
    sessionCardId: 'sc-0',
    cardId: 'c0',
    front: 'only card',
    back: 'answer',
    example: null,
    imageUrl: null,
  },
] as StudyCard[];

const twoCards = [
  {
    sessionCardId: 'sc-0',
    cardId: 'c0',
    front: 'card 0',
    back: 'back 0',
    example: null,
    imageUrl: null,
  },
  {
    sessionCardId: 'sc-1',
    cardId: 'c1',
    front: 'card 1',
    back: 'back 1',
    example: null,
    imageUrl: null,
  },
] as StudyCard[];

describe('FlashcardMode completion & known/still-learning flow', () => {
  beforeEach(() => {
    completeSession.mockClear();
    recordAnswer.mockClear();
    playCorrectMock.mockClear();
    useStudyPreferences.setState({ soundEnabled: true });
  });

  afterEach(() => {
    cleanup();
    useStudyStore.getState().reset();
  });

  it('completes the session and plays sound when the last card is marked as known', async () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards: singleCard,
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });

    const knowIt = screen.getByRole('button', { name: /Know it/i });
    await act(async () => {
      fireEvent.click(knowIt);
    });

    expect(playCorrectMock).toHaveBeenCalledTimes(1);
    expect(recordAnswer).toHaveBeenCalledWith('c0', true);
    expect(completeSession).toHaveBeenCalledTimes(1);
  });

  it('requeues a "Still learning" card into the next round without playing sound', async () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards: twoCards,
        settings: {
          randomize: false,
          cardsPerRound: 2,
          requeueWrong: true,
          presentation: 'default',
          mcDirection: 'front_to_back',
        },
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });

    // Card 0: ArrowLeft -> Still learning (no sound).
    await act(async () => {
      fireEvent.keyDown(window, { code: 'ArrowLeft' });
    });
    expect(playCorrectMock).not.toHaveBeenCalled();
    expect(recordAnswer).toHaveBeenLastCalledWith('c0', false);

    // Card 1: ArrowRight -> Know it (sound plays).
    await act(async () => {
      fireEvent.keyDown(window, { code: 'ArrowRight' });
    });
    expect(playCorrectMock).toHaveBeenCalledTimes(1);
    expect(recordAnswer).toHaveBeenLastCalledWith('c1', true);

    // Round 1 ended with 1 still-learning card -> round summary shows, session not complete.
    expect(completeSession).not.toHaveBeenCalled();
    expect(useStudyStore.getState().currentRound).toEqual(['c0']);
  });

  const initTwoCards = () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards: twoCards,
        settings: {
          randomize: false,
          cardsPerRound: 2,
          requeueWrong: true,
          presentation: 'default',
          mcDirection: 'front_to_back',
        },
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });
  };

  it('Space flips the card instead of re-clicking a focused "Know it" button', async () => {
    initTwoCards();
    const knowIt = screen.getByRole('button', { name: /Know it/i });
    await act(async () => {
      fireEvent.click(knowIt);
    });
    expect(recordAnswer).toHaveBeenCalledTimes(1);

    knowIt.focus();
    let notPrevented = true;
    act(() => {
      notPrevented = fireEvent.keyDown(knowIt, { code: 'Space' });
    });

    // Default prevented → the browser does not turn this Space into a click on "Know it".
    expect(notPrevented).toBe(false);
    expect(recordAnswer).toHaveBeenCalledTimes(1);
    expect(useStudyStore.getState().currentIndex).toBe(1);
  });

  it('ignores arrow keys typed into a text field such as the guide chat', () => {
    initTwoCards();
    const chatInput = document.createElement('input');
    document.body.appendChild(chatInput);
    try {
      const notPrevented = fireEvent.keyDown(chatInput, { code: 'ArrowLeft' });
      fireEvent.keyDown(chatInput, { code: 'ArrowRight' });
      fireEvent.keyDown(chatInput, { code: 'Space' });

      expect(notPrevented).toBe(true);
      expect(recordAnswer).not.toHaveBeenCalled();
      expect(useStudyStore.getState().currentIndex).toBe(0);
    } finally {
      chatInput.remove();
    }
  });

  it('has no back button, so a card cannot be graded twice in one round', () => {
    initTwoCards();
    expect(screen.queryByRole('button', { name: /Previous card/i })).toBeNull();
  });

  it('no longer shows the end-of-round banner that graded the last card as known', () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards: singleCard,
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });

    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.queryByRole('button', { name: /Next round/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Still learning/i })).toBeInTheDocument();
  });

  it('autoplay moves on without grading the card or playing the chime', () => {
    vi.useFakeTimers();
    try {
      initTwoCards();
      fireEvent.click(screen.getByRole('button', { name: /Autoplay/i }));

      // 4s: flip to the back; 4s later: move to the next card.
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      const state = useStudyStore.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.correctCount).toBe(0);
      expect(recordAnswer).not.toHaveBeenCalled();
      expect(playCorrectMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
