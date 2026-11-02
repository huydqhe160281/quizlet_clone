/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';

const { seed } = vi.hoisted(() => ({ seed: { value: 0 } }));
vi.mock('@/features/study/lib/session-praise', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/study/lib/session-praise')>()),
  getRoundPraiseSeed: () => seed.value,
}));

import { RoundSummary } from './RoundSummary';
import { renderWithLocale } from '@/test/render-with-locale';

function renderRound(
  correctCount: number,
  total: number,
  {
    mode = 'LEARN',
    roundIndex = 0,
    gradedCount,
  }: { mode?: string; roundIndex?: number; gradedCount?: number } = {}
) {
  return renderWithLocale(
    <RoundSummary
      roundIndex={roundIndex}
      correctCount={correctCount}
      total={total}
      gradedCount={gradedCount}
      mode={mode}
      onNextRound={() => {}}
    />,
    { locale: 'en' }
  );
}

describe('RoundSummary praise', () => {
  afterEach(() => {
    cleanup();
    seed.value = 0;
  });

  it('congratulates a perfect round', () => {
    renderRound(10, 10);
    expect(screen.getByText('Perfect! You got every card in this round 🎉')).toBeInTheDocument();
  });

  it('praises and encourages a 7/10 round', () => {
    renderRound(7, 10);
    expect(screen.getByText('Nice work! You remembered most of the cards.')).toBeInTheDocument();
  });

  it('gently suggests reviewing after a 2/10 round', () => {
    renderRound(2, 10);
    expect(
      screen.getByText('That’s okay, new cards take time. Review the ones you didn’t get.')
    ).toBeInTheDocument();
  });

  it('picks the next line in the next round, so consecutive rounds differ', () => {
    renderRound(7, 10, { roundIndex: 1 });
    expect(
      screen.getByText('Well done! A little more and the round is yours.')
    ).toBeInTheDocument();
  });

  it('scores against graded cards only', () => {
    // Flashcard: 3 of 4 graded cards known, the other 6 passed on autoplay → 75%.
    renderRound(3, 10, { mode: 'FLASHCARD', gradedCount: 4 });
    expect(screen.getByText('Nice work! You remembered most of the cards.')).toBeInTheDocument();
  });

  it('shows no praise when nothing in the round was graded', () => {
    const { container } = renderRound(0, 10, { mode: 'FLASHCARD', gradedCount: 0 });
    expect(container.querySelector('p.text-primary')).toBeNull();
  });
});
