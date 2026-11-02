/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';

const { studyLimitReached } = vi.hoisted(() => ({ studyLimitReached: { value: false } }));
vi.mock('@/features/auth/hooks/useStudyLimitReached', () => ({
  useStudyLimitReached: () => studyLimitReached.value,
}));

import { SessionComplete } from './SessionComplete';
import { renderWithLocale } from '@/test/render-with-locale';

describe('SessionComplete (Flashcard)', () => {
  afterEach(cleanup);

  it('never reports more reviewed cards than the set has when cards were requeued', () => {
    renderWithLocale(
      <SessionComplete mode="FLASHCARD" correctCount={0} reviewedCount={13} total={10} setId="s" />,
      { locale: 'en' }
    );
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });
});

describe('SessionComplete praise', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('cheers a perfect score', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderWithLocale(<SessionComplete mode="LEARN" correctCount={10} total={10} setId="s" />, {
      locale: 'en',
    });
    expect(screen.getByText('Outstanding! You nailed every card 🎉')).toBeInTheDocument();
  });

  it('encourages a low score', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    renderWithLocale(<SessionComplete mode="TEST" correctCount={3} total={10} setId="s" />, {
      locale: 'en',
    });
    expect(
      screen.getByText('Every review helps you remember longer. Keep going.')
    ).toBeInTheDocument();
  });

  it('does not call a run with requeued mistakes perfect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // Requeue brought every card back until right: 10/10 correct after 12 answers.
    renderWithLocale(
      <SessionComplete mode="LEARN" correctCount={10} reviewedCount={12} total={10} setId="s" />,
      { locale: 'en' }
    );
    expect(screen.getByText('Great job! You know almost the whole set.')).toBeInTheDocument();
  });

  it('scores flashcards by known answers over all graded answers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderWithLocale(
      <SessionComplete mode="FLASHCARD" correctCount={5} reviewedCount={8} total={5} setId="s" />,
      { locale: 'en' }
    );
    // 5 / 8 = 63% → the 60–79% band.
    expect(screen.getByText('Past the halfway mark — keep it up!')).toBeInTheDocument();
  });

  it('shows no praise when nothing was graded (flashcards on autoplay)', () => {
    const { container } = renderWithLocale(
      <SessionComplete mode="FLASHCARD" correctCount={0} reviewedCount={0} total={5} setId="s" />,
      { locale: 'en' }
    );
    expect(container.querySelector('p.text-primary')).toBeNull();
  });

  it('adds the final round’s own line after a multi-round run', () => {
    renderWithLocale(
      <SessionComplete
        mode="LEARN"
        correctCount={18}
        reviewedCount={20}
        total={20}
        lastRound={{ roundIndex: 1, correct: 2, graded: 10 }}
        setId="s"
      />,
      { locale: 'en' }
    );
    // Run is 90%, but the last round was 2/10 → its own "low" line.
    const line = screen.getByText(/^Round 2: /).textContent ?? '';
    expect(line).toMatch(/new cards take time|start is always hard|Don’t give up|Every pass/);
  });

  it('skips the final-round line for a single-round run', () => {
    renderWithLocale(
      <SessionComplete
        mode="LEARN"
        correctCount={8}
        total={10}
        lastRound={{ roundIndex: 0, correct: 8, graded: 10 }}
        setId="s"
      />,
      { locale: 'en' }
    );
    expect(screen.queryByText(/^Round 1: /)).toBeNull();
  });
});

describe('SessionComplete study limit', () => {
  afterEach(() => {
    cleanup();
    studyLimitReached.value = false;
  });

  it('asks an unverified account at the review limit to confirm its email', () => {
    studyLimitReached.value = true;
    renderWithLocale(<SessionComplete mode="LEARN" correctCount={5} total={5} setId="s" />, {
      locale: 'en',
    });
    expect(screen.getByText('Confirm your email to keep studying')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend email' })).toBeInTheDocument();
  });

  it('shows no notice below the limit', () => {
    renderWithLocale(<SessionComplete mode="LEARN" correctCount={5} total={5} setId="s" />, {
      locale: 'en',
    });
    expect(screen.queryByText('Confirm your email to keep studying')).not.toBeInTheDocument();
  });
});
