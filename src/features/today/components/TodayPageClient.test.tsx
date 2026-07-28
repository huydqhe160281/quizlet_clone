/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { TodayPlan } from '@/features/today/types';

const useTodayPlanMock = vi.hoisted(() => vi.fn());
const useUpdateStudyGoalMock = vi.hoisted(() =>
  vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
);

vi.mock('@/features/today/hooks/useTodayPlan', () => ({
  useTodayPlan: useTodayPlanMock,
  useUpdateStudyGoal: useUpdateStudyGoalMock,
}));

vi.mock('@/lib/navigation/use-nav-reselect-refetch', () => ({
  useNavReselectRefetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/i18n/LocaleProvider', () => ({
  useTranslations: () => (key: string) => key,
}));

import { TodayPageClient } from '@/features/today/components/TodayPageClient';
import { useNavReselectRefetch } from '@/lib/navigation/use-nav-reselect-refetch';

const emptyPlan: TodayPlan = {
  goal: { target: 20, completed: 0, remaining: 20, pct: 0 },
  queue: { items: [], returned: 0, totalEligible: 0 },
  insights: {
    reviewsLast7Days: 0,
    accuracyLast7Days: 0,
    currentStreak: 0,
    weakSets: [],
  },
  recommendation: { kind: 'empty', href: '/sets', setId: null, mode: null },
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
});
