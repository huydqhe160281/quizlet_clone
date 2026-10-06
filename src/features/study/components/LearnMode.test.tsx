/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import {
  LEARN_CORRECT_AUTO_ADVANCE_MS,
  LEARN_INCORRECT_AUTO_ADVANCE_MS,
  LearnMode,
} from './learn/LearnMode';
import { useStudySession } from '@/features/study/hooks/useStudySession';
import { STUDY_SESSION_SETTINGS_DEFAULTS } from '@/features/study/schemas/study.schema';
import { renderWithLocale } from '@/test/render-with-locale';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/features/study/hooks/useStudySession', () => ({
  useStudySession: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseStudySession = useStudySession as Mock<typeof useStudySession>;

const EMBEDDED_MCQ_FRONT =
  'Danh mục tài khoản được khai báo ở menu nào?\n\na. Tổng hợp\nb. Danh mục và số dư\nc. Báo cáo\nd. Công cụ';

function studyCard(overrides: {
  cardId: string;
  front: string;
  back: string;
  example?: string | null;
}) {
  return {
    sessionCardId: `sc-${overrides.cardId}`,
    cardId: overrides.cardId,
    front: overrides.front,
    back: overrides.back,
    example: overrides.example ?? null,
    imageUrl: null,
  };
}

function mockLearnSession(overrides: Partial<ReturnType<typeof useStudySession>> = {}) {
  const nextCard = vi.fn();
  const completeSession = vi.fn();
  mockUseStudySession.mockReturnValue({
    cards: [
      studyCard({ cardId: 'c1', front: EMBEDDED_MCQ_FRONT, back: 'B' }),
      studyCard({
        cardId: 'c2',
        front: 'Another question?\n\na. One\nb. Two\nc. Three\nd. Four',
        back: 'A',
      }),
    ],
    currentIndex: 0,
    currentRound: ['c1', 'c2'],
    roundIndex: 0,
    correctInRound: 0,
    isLoading: false,
    error: null,
    isComplete: false,
    settings: {
      ...STUDY_SESSION_SETTINGS_DEFAULTS,
      presentation: 'multiple_choice',
      mcDirection: 'front_to_back',
    },
    recordRoundAnswer: vi.fn().mockReturnValue(false),
    recordAnswer: vi.fn(),
    nextCard,
    completeSession,
    ...overrides,
  } as unknown as ReturnType<typeof useStudySession>);
  return { nextCard, completeSession };
}

afterEach(() => {
  cleanup();
});

function clickMcqOption(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('LearnMode Presentation', () => {
  it('uses embedded a/b/c/d options when front contains MCQ text', () => {
    mockUseStudySession.mockReturnValue({
      cards: [studyCard({ cardId: 'c1', front: EMBEDDED_MCQ_FRONT, back: 'B' })],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      correctInRound: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        ...STUDY_SESSION_SETTINGS_DEFAULTS,
        presentation: 'multiple_choice',
        mcDirection: 'front_to_back',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
      completeSession: vi.fn(),
    } as unknown as ReturnType<typeof useStudySession>);

    renderWithLocale(<LearnMode setId="test-set" />);

    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();
    expect(screen.getByText('Danh mục tài khoản được khai báo ở menu nào?')).toBeInTheDocument();
    expect(screen.getByText('a. Tổng hợp')).toBeInTheDocument();
    expect(screen.getByText('b. Danh mục và số dư')).toBeInTheDocument();
    expect(screen.queryByText(/^a\. Tổng hợp\nb\./)).toBeNull();
  });

  it('renders back prompt and front MC options when mcDirection is back_to_front', () => {
    mockUseStudySession.mockReturnValue({
      cards: [studyCard({ cardId: 'c1', front: 'front1', back: 'back1' })],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      correctInRound: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        ...STUDY_SESSION_SETTINGS_DEFAULTS,
        presentation: 'multiple_choice',
        mcDirection: 'back_to_front',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
      completeSession: vi.fn(),
    } as unknown as ReturnType<typeof useStudySession>);

    renderWithLocale(<LearnMode setId="test-set" />);

    expect(screen.getByText('Chọn thuật ngữ đúng cho định nghĩa sau')).toBeInTheDocument();
    expect(screen.getAllByText('back1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders text area and no MC options when presentation is default (written)', () => {
    mockUseStudySession.mockReturnValue({
      cards: [studyCard({ cardId: 'c1', front: 'front1', back: 'back1' })],
      currentIndex: 0,
      currentRound: ['c1'],
      roundIndex: 0,
      correctInRound: 0,
      isLoading: false,
      error: null,
      isComplete: false,
      settings: {
        ...STUDY_SESSION_SETTINGS_DEFAULTS,
        presentation: 'default',
      },
      recordRoundAnswer: vi.fn(),
      recordAnswer: vi.fn(),
      nextCard: vi.fn(),
      completeSession: vi.fn(),
    } as unknown as ReturnType<typeof useStudySession>);

    renderWithLocale(<LearnMode setId="test-set" />);

    expect(screen.getAllByText('front1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/câu trả lời/i)).toBeInTheDocument();
  });
});

describe('LearnMode auto-advance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances once after 1s when a correct MCQ option is selected', () => {
    const { nextCard } = mockLearnSession();
    renderWithLocale(<LearnMode setId="test-set" />);

    clickMcqOption('b. Danh mục và số dư');

    expect(nextCard).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(LEARN_CORRECT_AUTO_ADVANCE_MS - 1);
    });
    expect(nextCard).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(LEARN_CORRECT_AUTO_ADVANCE_MS);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);
  });

  it('does not auto-advance before 5s on incorrect answer, then advances once', () => {
    const { nextCard } = mockLearnSession();
    renderWithLocale(<LearnMode setId="test-set" />);

    clickMcqOption('a. Tổng hợp');

    act(() => {
      vi.advanceTimersByTime(LEARN_INCORRECT_AUTO_ADVANCE_MS - 100);
    });
    expect(nextCard).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(LEARN_INCORRECT_AUTO_ADVANCE_MS);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);
  });

  it('advances immediately on Continue for incorrect answer and does not double-fire', () => {
    const { nextCard } = mockLearnSession();
    renderWithLocale(<LearnMode setId="test-set" />);

    clickMcqOption('a. Tổng hợp');
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    expect(nextCard).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(LEARN_INCORRECT_AUTO_ADVANCE_MS);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);
  });

  it('advances immediately on Continue for correct answer and does not double-fire', () => {
    const { nextCard } = mockLearnSession();
    renderWithLocale(<LearnMode setId="test-set" />);

    clickMcqOption('b. Danh mục và số dư');
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    expect(nextCard).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(LEARN_CORRECT_AUTO_ADVANCE_MS);
    });
    expect(nextCard).toHaveBeenCalledTimes(1);
  });
});
