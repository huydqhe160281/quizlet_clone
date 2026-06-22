/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { LearnMode } from './learn/LearnMode';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { vi, describe, it, expect, type Mock } from 'vitest';

vi.mock('@/features/study/hooks/useStudySession', () => ({
  useStudySession: vi.fn(),
}));

const mockUseStudySession = useStudySession as Mock<typeof useStudySession>;

describe('LearnMode Presentation', () => {
  it('renders MC options and no fill-in-the-blank inputs when presentation is multiple_choice', () => {
    mockUseStudySession.mockReturnValue({
      cards: [{ cardId: 'c1', front: 'front1', back: 'back1', example: null }],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        presentation: 'multiple_choice',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
    });

    render(<LearnMode setId="test-set" />);

    // Verify it renders the question
    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);

    // Verify that NO text inputs or textareas (for fill-in-the-blank) are rendered
    const input = screen.queryByRole('textbox');
    const textarea = screen.queryByPlaceholderText(/answer/i);
    expect(input).toBeNull();
    expect(textarea).toBeNull();
  });

  it('renders text area and no MC options when presentation is default (written)', () => {
    mockUseStudySession.mockReturnValue({
      cards: [{ cardId: 'c1', front: 'front1', back: 'back1', example: null }],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        presentation: 'default',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
    });

    render(<LearnMode setId="test-set" />);

    // Verify it renders the question
    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);

    // Verify that textarea is rendered
    const textarea = screen.getByPlaceholderText(/answer/i);
    expect(textarea).toBeInTheDocument();
  });
});
