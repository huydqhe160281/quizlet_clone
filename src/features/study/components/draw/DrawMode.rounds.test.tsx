/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { DrawMode } from './DrawMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { HINT_DISPLAY_MS } from '@/features/study/lib/draw-config';
import { renderWithLocale } from '@/test/render-with-locale';

const completeSessionMock = vi.hoisted(() => vi.fn());

// Real store + round engine; only network-facing hook parts are stubbed.
vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({
      ...store(),
      recordAnswer: vi.fn(),
      completeSession: completeSessionMock,
    }),
  };
});

vi.mock('@/features/study/components/draw/HanziWriterCanvas', () => ({
  HanziWriterCanvas: ({
    character,
    onComplete,
  }: {
    character: string;
    onComplete: (isCorrect: boolean) => void;
  }) => (
    <button type="button" onClick={() => onComplete(true)}>
      draw {character}
    </button>
  ),
}));

const cards = Array.from({ length: 3 }, (_, i) => ({
  sessionCardId: `sc-${i}`,
  cardId: `c${i}`,
  front: `字${i}`,
  back: `meaning-${i}`,
  example: null,
  imageUrl: null,
})) as StudyCard[];

function drawCorrect(character: string) {
  fireEvent.click(screen.getByRole('button', { name: `draw ${character}` }));
  act(() => {
    vi.advanceTimersByTime(HINT_DISPLAY_MS);
  });
}

describe('DrawMode auto-advance at round boundaries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completeSessionMock.mockClear();
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'DRAW',
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
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows the round summary instead of skipping into or completing the next round', () => {
    renderWithLocale(<DrawMode setId="set-1" />, { locale: 'en' });

    drawCorrect('字0');
    drawCorrect('字1');

    expect(screen.getByText('Round 1 complete')).toBeInTheDocument();
    // Round 2 holds a single card; it must not be auto-completed unstudied.
    expect(useStudyStore.getState().isComplete).toBe(false);
    expect(completeSessionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Next round/ }));
    expect(screen.getByRole('button', { name: 'draw 字2' })).toBeInTheDocument();
  });

  it('completes the session only after the last card is drawn', () => {
    renderWithLocale(<DrawMode setId="set-1" />, { locale: 'en' });

    drawCorrect('字0');
    drawCorrect('字1');
    fireEvent.click(screen.getByRole('button', { name: /Next round/ }));
    drawCorrect('字2');

    expect(useStudyStore.getState().isComplete).toBe(true);
    expect(completeSessionMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the answered card on screen while its hint is shown', () => {
    renderWithLocale(<DrawMode setId="set-1" />, { locale: 'en' });

    drawCorrect('字0');
    fireEvent.click(screen.getByRole('button', { name: 'draw 字1' }));

    expect(screen.getByRole('button', { name: 'draw 字1' })).toBeInTheDocument();
    expect(screen.getByText('meaning-1 — 字1')).toBeInTheDocument();
  });
});
