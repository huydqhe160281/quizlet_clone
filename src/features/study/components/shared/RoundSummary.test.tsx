/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { RoundSummary } from './RoundSummary';
import { renderWithLocale } from '@/test/render-with-locale';

function renderRound(correctCount: number, total: number, mode = 'LEARN') {
  renderWithLocale(
    <RoundSummary
      roundIndex={0}
      correctCount={correctCount}
      total={total}
      mode={mode}
      onNextRound={() => {}}
    />,
    { locale: 'en' }
  );
}

describe('RoundSummary praise', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('congratulates a perfect round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderRound(10, 10);
    expect(screen.getByText('Perfect! You got every card in this round 🎉')).toBeInTheDocument();
  });

  it('praises and encourages a 7/10 round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderRound(7, 10);
    expect(screen.getByText('Nice work! You remembered most of the cards.')).toBeInTheDocument();
  });

  it('gently suggests reviewing after a 2/10 round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderRound(2, 10);
    expect(
      screen.getByText('That’s okay, new cards take time. Review the ones you missed.')
    ).toBeInTheDocument();
  });

  it('scores flashcard rounds by known cards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    renderRound(5, 5, 'FLASHCARD');
    expect(screen.getByText('Brilliant! Bring that form into the next round.')).toBeInTheDocument();
  });
});
