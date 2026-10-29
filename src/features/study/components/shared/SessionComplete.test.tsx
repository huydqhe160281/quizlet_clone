/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
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
      screen.getByText('Don\u2019t give up — memory takes time to settle in.')
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
    // 5 / 8 = 63% → the 50–74% band.
    expect(screen.getByText('Past the halfway mark — keep it up!')).toBeInTheDocument();
  });
});
