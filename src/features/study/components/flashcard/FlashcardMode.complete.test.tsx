/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { FlashcardMode } from './FlashcardMode';
import { useStudyStore, type StudyCard } from '@/features/study/store';
import { renderWithLocale } from '@/test/render-with-locale';

const completeSession = vi.hoisted(() => vi.fn(async () => {}));

// Real store + round engine; only the network-facing hook parts are stubbed.
vi.mock('@/features/study/hooks/useStudySession', async () => {
  const { useStudyStore: store } = await import('@/features/study/store');
  return {
    useStudySession: () => ({ ...store(), recordAnswer: vi.fn(), completeSession }),
  };
});

const cards = [
  {
    sessionCardId: 'sc-0',
    cardId: 'c0',
    front: 'only card',
    back: 'answer',
    example: null,
    imageUrl: null,
  },
] as StudyCard[];

describe('FlashcardMode completion', () => {
  afterEach(() => {
    cleanup();
    useStudyStore.getState().reset();
  });

  it('completes the session when the last card of the last round is passed', async () => {
    act(() => {
      useStudyStore.getState().initSession({
        sessionId: 'session-1',
        setId: 'set-1',
        mode: 'FLASHCARD',
        cards,
      });
    });
    renderWithLocale(<FlashcardMode setId="set-1" />, { locale: 'en' });

    const [next] = screen.getAllByRole('button', { name: /Next round/ });
    await act(async () => {
      fireEvent.click(next!);
    });

    // Before the fix the stale render snapshot said "not complete", so a round summary
    // showed and completeSession was never sent.
    expect(completeSession).toHaveBeenCalledTimes(1);
  });
});
