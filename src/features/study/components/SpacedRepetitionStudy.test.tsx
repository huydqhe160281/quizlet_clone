/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { SpacedRepetitionStudy } from './SpacedRepetitionStudy';
import { renderWithLocale } from '@/test/render-with-locale';
import { StudyLimitError } from '@/features/study/lib/study-limit';

const submitReviewMock = vi.hoisted(() => vi.fn());
const dueCardsError = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('@/features/study/hooks/useSpacedRepetition', () => ({
  useDueCards: () => ({
    data: {
      data: ['a', 'b', 'c'].map((id) => ({
        cardId: id,
        front: `front-${id}`,
        back: `back-${id}`,
        setId: 'set-1',
        setTitle: 'Set',
      })),
    },
    isLoading: false,
    error: dueCardsError.value,
    refetch: vi.fn(),
  }),
  useSubmitReview: () => submitReviewMock,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Radix Select is not usable in jsdom; a native select keeps the same contract.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <select aria-label="style" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

function startFlashcardReview() {
  renderWithLocale(<SpacedRepetitionStudy />, { locale: 'en' });
  fireEvent.change(screen.getAllByLabelText('style')[0]!, { target: { value: 'flashcard' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
}

describe('SpacedRepetitionStudy grading', () => {
  beforeEach(() => {
    submitReviewMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('advances immediately and grades once even when a grade is tapped twice', () => {
    vi.useFakeTimers();
    try {
      // Never-resolving review: the UI must not wait for the network.
      submitReviewMock.mockImplementation(() => new Promise(() => undefined));
      startFlashcardReview();

      const good = screen.getByRole('button', { name: 'Good' });
      fireEvent.click(good);
      fireEvent.click(good);
      fireEvent.click(screen.getByRole('button', { name: 'Easy' }));

      expect(submitReviewMock).toHaveBeenCalledTimes(1);
      // Advanced exactly one card without waiting for the review request.
      expect(screen.getByText('2 / 3', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Good' })).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts HARD as not correct, like the server', () => {
    vi.useFakeTimers();
    try {
      submitReviewMock.mockResolvedValue({ status: 'ok' });
      startFlashcardReview();

      for (const grade of ['Hard', 'Good', 'Easy']) {
        fireEvent.click(screen.getByRole('button', { name: grade }));
        act(() => {
          vi.advanceTimersByTime(300);
        });
      }

      // Round summary: 2 of 3 correct (HARD is a miss).
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('requeues wrong MCQ answers synchronously even when submitReview is still in flight', () => {
    vi.useFakeTimers();
    try {
      // Never-resolving review mutation simulates slow network.
      submitReviewMock.mockImplementation(() => new Promise(() => undefined));
      renderWithLocale(<SpacedRepetitionStudy />, { locale: 'en' });
      // Shuffling is on by default; this test relies on the a, b, c order.
      fireEvent.click(screen.getByRole('checkbox', { name: 'Shuffle card order' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start review' }));

      // Answer all 3 cards in Round 1: first wrong, next two right.
      fireEvent.click(screen.getByRole('button', { name: 'back-b' }));
      fireEvent.click(screen.getByRole('button', { name: /Next question/i }));

      fireEvent.click(screen.getByRole('button', { name: 'back-b' }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole('button', { name: 'back-c' }));
      fireEvent.click(screen.getByRole('button', { name: /Finish round/i }));

      // Start Round 2 -> card 'a' must be in the remediation round despite in-flight review.
      fireEvent.click(screen.getByRole('button', { name: /Next round/i }));
      expect(screen.getByText('front-a')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('SpacedRepetitionStudy study limit', () => {
  afterEach(() => {
    cleanup();
    dueCardsError.value = null;
  });

  it('asks to confirm the email when the review queue is gated', () => {
    dueCardsError.value = new StudyLimitError();
    renderWithLocale(<SpacedRepetitionStudy />, { locale: 'en' });
    expect(screen.getByText('Confirm your email to keep studying')).toBeInTheDocument();
  });
});
