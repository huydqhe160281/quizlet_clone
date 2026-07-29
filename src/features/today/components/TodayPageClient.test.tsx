/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { TodayPlan } from '@/features/today/types';

const useTodayPlanMock = vi.hoisted(() => vi.fn());
const useUpdateStudyGoalsMock = vi.hoisted(() =>
  vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
);
const createStudySessionOnceMock = vi.hoisted(() => vi.fn());
const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/today/hooks/useTodayPlan', () => ({
  useTodayPlan: useTodayPlanMock,
  useUpdateStudyGoals: useUpdateStudyGoalsMock,
  useUpdateStudyGoal: useUpdateStudyGoalsMock,
}));

vi.mock('@/features/study/lib/create-session-once', () => ({
  createStudySessionOnce: (...args: unknown[]) => createStudySessionOnceMock(...args),
}));

vi.mock('@/lib/navigation/use-nav-reselect-refetch', () => ({
  useNavReselectRefetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n/LocaleProvider', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

import { TodayPageClient } from '@/features/today/components/TodayPageClient';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

const emptyPlan: TodayPlan = {
  goal: { target: 20, completed: 0, remaining: 20, pct: 0, preferredTimezone: 'UTC' },
  queue: { items: [], returned: 0, totalEligible: 0 },
  insights: {
    reviewsLast7Days: 0,
    accuracyLast7Days: 0,
    currentStreak: 0,
    weakSets: [],
  },
  recommendation: { kind: 'empty', href: '/sets', setId: null, mode: null, cardIds: null },
};

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TodayPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('Scenario: Empty queue state', () => {
    useTodayPlanMock.mockReturnValue({
      data: emptyPlan,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    wrap(<TodayPageClient />);
    expect(screen.getByText('todayPage.queueEmptyTitle')).toBeInTheDocument();
  });

  it('Scenario: Error with retry', () => {
    const refetch = vi.fn();
    useTodayPlanMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch,
    });
    wrap(<TodayPageClient />);
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ui.retry' })).toBeInTheDocument();
  });

  it('Scenario: Nav reselect refetch', () => {
    const refetch = vi.fn();
    useTodayPlanMock.mockReturnValue({
      data: emptyPlan,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    wrap(<TodayPageClient />);
    expect(useNavReselectRefetch).toHaveBeenCalledWith('/today', refetch);
  });

  it('Scenario: Timezone control visible', () => {
    useTodayPlanMock.mockReturnValue({
      data: emptyPlan,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    wrap(<TodayPageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'todayPage.editGoal' }));
    expect(screen.getByLabelText('todayPage.timezoneLabel')).toBeInTheDocument();
  });

  it('Scenario: Cards-only save preserves non-curated timezone', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      dailyGoalCards: 25,
      preferredTimezone: 'America/Chicago',
    });
    useUpdateStudyGoalsMock.mockReturnValue({ mutateAsync, isPending: false });
    useTodayPlanMock.mockReturnValue({
      data: {
        ...emptyPlan,
        goal: {
          target: 20,
          completed: 0,
          remaining: 20,
          pct: 0,
          preferredTimezone: 'America/Chicago',
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    wrap(<TodayPageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'todayPage.editGoal' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'todayPage.saveGoal' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ dailyGoalCards: 25 });
    });
  });

  it('Scenario: CTA passes cardIds', async () => {
    createStudySessionOnceMock.mockResolvedValue({
      data: { id: 'existing-session', sessionCards: [] },
      streak: { currentStreak: 1, longestStreak: 1, changed: true },
    });
    useTodayPlanMock.mockReturnValue({
      data: {
        ...emptyPlan,
        queue: {
          items: [
            {
              cardId: 'c1',
              setId: 'set-a',
              setTitle: 'A',
              reason: 'weak',
              dueDate: null,
              easeFactor: 1.8,
            },
          ],
          returned: 1,
          totalEligible: 1,
        },
        recommendation: {
          kind: 'set-session',
          href: '/sets/set-a/learn',
          setId: 'set-a',
          mode: 'LEARN',
          cardIds: ['c1'],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    wrap(<TodayPageClient />);
    fireEvent.click(screen.getByRole('button', { name: /startSetSessionFocus/ }));

    await waitFor(() => {
      expect(createStudySessionOnceMock).toHaveBeenCalledWith('set-a', 'LEARN', undefined, ['c1']);
      expect(routerPushMock).toHaveBeenCalledWith('/sets/set-a/learn?sessionId=existing-session');
    });
  });

  it('Scenario: Resume incomplete LEARN session', async () => {
    createStudySessionOnceMock.mockResolvedValue({
      data: { id: 'existing-session', sessionCards: [] },
    });
    useTodayPlanMock.mockReturnValue({
      data: {
        ...emptyPlan,
        recommendation: {
          kind: 'set-session',
          href: '/sets/set-a/learn',
          setId: 'set-a',
          mode: 'LEARN',
          cardIds: ['c1', 'c2'],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    wrap(<TodayPageClient />);
    fireEvent.click(screen.getByRole('button', { name: /startSetSessionFocus/ }));

    await waitFor(() => {
      expect(createStudySessionOnceMock).toHaveBeenCalledWith('set-a', 'LEARN', undefined, [
        'c1',
        'c2',
      ]);
    });
  });
});
