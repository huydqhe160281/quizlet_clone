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

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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

    expect(screen.getByText('back1')).toBeInTheDocument();
    expect(screen.getByText('front1')).toBeInTheDocument();

    const textarea = screen.queryByPlaceholderText(/câu trả lời/i);
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

    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/câu trả lời/i)).toBeInTheDocument();
  });
});
