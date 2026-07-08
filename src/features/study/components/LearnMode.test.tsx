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
  it('uses embedded a/b/c/d options when front contains MCQ text', () => {
    const front =
      'Danh mục tài khoản được khai báo ở menu nào?\n\na. Tổng hợp\nb. Danh mục và số dư\nc. Báo cáo\nd. Công cụ';
    mockUseStudySession.mockReturnValue({
      cards: [{ cardId: 'c1', front, back: 'B', example: null }],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        presentation: 'multiple_choice',
        mcDirection: 'front_to_back',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
    });

    render(<LearnMode setId="test-set" />);

    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();
    expect(screen.getByText('Danh mục tài khoản được khai báo ở menu nào?')).toBeInTheDocument();
    expect(screen.getByText('a. Tổng hợp')).toBeInTheDocument();
    expect(screen.getByText('b. Danh mục và số dư')).toBeInTheDocument();
    expect(screen.queryByText(/^a\. Tổng hợp\nb\./)).toBeNull();
  });

  it('renders back prompt and front MC options when mcDirection is back_to_front', () => {
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
        mcDirection: 'back_to_front',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
    });

    render(<LearnMode setId="test-set" />);

    expect(screen.getByText('Chọn thuật ngữ đúng cho định nghĩa sau')).toBeInTheDocument();
    expect(screen.getAllByText('back1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);
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
