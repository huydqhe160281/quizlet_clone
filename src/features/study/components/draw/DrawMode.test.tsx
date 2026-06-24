/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawMode } from './DrawMode';
import { useStudySession } from '@/features/study/hooks/useStudySession';

vi.mock('@/features/study/hooks/useStudySession', () => ({
  useStudySession: vi.fn(),
}));

vi.mock('@/features/study/components/draw/HanziWriterCanvas', () => ({
  HanziWriterCanvas: ({ character, back }: { character: string; back: string }) => (
    <div data-testid="hanzi-canvas">
      {character}|{back}
    </div>
  ),
}));

const mockUseStudySession = useStudySession as Mock<typeof useStudySession>;

describe('DrawMode', () => {
  it('shows back prompt and passes front to canvas', () => {
    mockUseStudySession.mockReturnValue({
      cards: [{ cardId: 'c1', front: '大', back: 'big', example: null }],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      correctInRound: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn().mockResolvedValue(undefined),
      nextCard: vi.fn(),
      completeSession: vi.fn(),
    });

    render(<DrawMode setId="set-1" />);

    expect(screen.getByText('big')).toBeInTheDocument();
    expect(screen.getByTestId('hanzi-canvas')).toHaveTextContent('大|big');
  });
});
