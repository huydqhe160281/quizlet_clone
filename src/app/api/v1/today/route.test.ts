import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';

const requireUserIdMock = vi.hoisted(() => vi.fn());
const getTodayPlanMock = vi.hoisted(() => vi.fn());
const updateStudyGoalsMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth/auth-utils', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/server/services/learning/today.service', () => ({
  getTodayPlan: getTodayPlanMock,
}));

vi.mock('@/server/services/learning/study-goals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/services/learning/study-goals')>();
  return {
    ...actual,
    updateStudyGoals: updateStudyGoalsMock,
  };
});

import { GET } from '@/app/api/v1/today/route';
import { PATCH } from '@/app/api/v1/user/study-goals/route';

describe('Today & study-goals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-a');
    getTodayPlanMock.mockResolvedValue({
      goal: { target: 20, completed: 0, remaining: 20, pct: 0, preferredTimezone: 'UTC' },
      queue: { items: [], returned: 0, totalEligible: 0 },
      insights: {
        reviewsLast7Days: 0,
        accuracyLast7Days: 0,
        currentStreak: 0,
        weakSets: [],
      },
      recommendation: { kind: 'empty', href: '/sets', setId: null, mode: null, cardIds: null },
    });
    updateStudyGoalsMock.mockResolvedValue({ dailyGoalCards: 30, preferredTimezone: 'UTC' });
  });

  it('Scenario: Authenticated aggregate', async () => {
    const res = await GET(new Request('http://localhost/api/v1/today'), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body).toHaveProperty('goal');
    expect(body).toHaveProperty('queue');
    expect(body).toHaveProperty('insights');
    expect(body).toHaveProperty('recommendation');
    expect(getTodayPlanMock).toHaveBeenCalled();
  });

  it('Scenario: Unauthenticated', async () => {
    requireUserIdMock.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Not authenticated', 401));
    const res = await GET(new Request('http://localhost/api/v1/today'), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it('Scenario: Unauthenticated update rejected', async () => {
    requireUserIdMock.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Not authenticated', 401));
    const res = await PATCH(
      new Request('http://localhost/api/v1/user/study-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalCards: 30 }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(401);
  });

  it('Scenario: Update goal (API)', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/v1/user/study-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalCards: 30 }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(updateStudyGoalsMock).toHaveBeenCalledWith('user-a', { dailyGoalCards: 30 });
  });

  it('Scenario: Reject out-of-range goal (API)', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/v1/user/study-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalCards: 999 }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(res.status).toBe(400);
  });

  it('Scenario: Limit clamp (API)', async () => {
    await GET(new Request('http://localhost/api/v1/today?limit=999'), {
      params: Promise.resolve({}),
    });
    expect(getTodayPlanMock).toHaveBeenCalledWith('user-a', { limit: 50 });
  });

  it('Scenario: Body-supplied userId is ignored', async () => {
    await PATCH(
      new Request('http://localhost/api/v1/user/study-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoalCards: 25, userId: 'user-b' }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(updateStudyGoalsMock).toHaveBeenCalledWith('user-a', { dailyGoalCards: 25 });
  });
});
