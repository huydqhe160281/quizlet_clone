/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { SpacedRepetitionStudy } from './SpacedRepetitionStudy';
import { renderWithLocale } from '@/test/render-with-locale';

const submitReviewMock = vi.hoisted(() => vi.fn());

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
    error: null,
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

  it('submits one review per card even when a grade is tapped twice', async () => {
    let resolveReview: (value: unknown) => void = () => undefined;
    submitReviewMock.mockImplementation(() => new Promise((resolve) => (resolveReview = resolve)));
    startFlashcardReview();

    const good = screen.getByRole('button', { name: 'Good' });
    fireEvent.click(good);
    fireEvent.click(good);
    fireEvent.click(screen.getByRole('button', { name: 'Easy' }));

    expect(submitReviewMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Good' })).toBeDisabled();

    await act(async () => {
      resolveReview({ status: 'ok' });
    });

    // Advanced exactly one card, and grading is enabled again.
    expect(screen.getByText('2 / 3', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeEnabled();
  });

  it('counts HARD as not correct, like the server', async () => {
    submitReviewMock.mockResolvedValue({ status: 'ok' });
    startFlashcardReview();

    for (const grade of ['Hard', 'Good', 'Easy']) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: grade }));
      });
    }

    // Round summary: 2 of 3 correct (HARD is a miss).
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
