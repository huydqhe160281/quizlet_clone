import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  QUEUE_DEFAULT_LIMIT,
  QUEUE_MAX_LIMIT,
  WEAK_EASE_THRESHOLD,
} from '@/server/services/learning/constants';
import { clampQueueLimit, rankAndCap, type RankableCard } from '@/server/services/learning/ranking';

const now = new Date('2026-07-28T12:00:00.000Z');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('learning queue ranking', () => {
  it('Scenario: Due cards appear before new cards when both exist', () => {
    const cards: RankableCard[] = [
      {
        cardId: 'new-1',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'new',
        dueDate: null,
        easeFactor: null,
      },
      {
        cardId: 'due-1',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'due',
        dueDate: new Date('2026-07-20T00:00:00.000Z'),
        easeFactor: 2.5,
      },
    ];

    const { items } = rankAndCap(cards, now, 10);
    expect(items[0]?.cardId).toBe('due-1');
    expect(items[0]?.reason).toBe('due');
    expect(items[1]?.reason).toBe('new');
  });

  it('Scenario: Weak card included when not due', () => {
    const cards: RankableCard[] = [
      {
        cardId: 'weak-1',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'weak',
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        easeFactor: WEAK_EASE_THRESHOLD - 0.2,
        recentFail: false,
      },
    ];

    const { items, totalEligible } = rankAndCap(cards, now, 10);
    expect(totalEligible).toBe(1);
    expect(items[0]?.reason).toBe('weak');
    expect(items[0]?.easeFactor).toBeLessThan(WEAK_EASE_THRESHOLD);
  });

  it('Scenario: Weak card not duplicated when also due', () => {
    // Composition layer assigns due > weak; ranking only receives one reason per card.
    const cards: RankableCard[] = [
      {
        cardId: 'both-1',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'due',
        dueDate: new Date('2026-07-27T00:00:00.000Z'),
        easeFactor: 1.8,
      },
    ];

    const { items } = rankAndCap(cards, now, 10);
    expect(items.filter((i) => i.cardId === 'both-1')).toHaveLength(1);
    expect(items[0]?.reason).toBe('due');
  });

  it('Scenario: Stable tie-break', () => {
    const cards: RankableCard[] = [
      {
        cardId: 'b',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'new',
        dueDate: null,
        easeFactor: null,
      },
      {
        cardId: 'a',
        setId: 'set-a',
        setTitle: 'A',
        reason: 'new',
        dueDate: null,
        easeFactor: null,
      },
    ];

    const { items } = rankAndCap(cards, now, 10);
    expect(items.map((i) => i.cardId)).toEqual(['a', 'b']);
  });

  it('Scenario: Default cap', () => {
    const cards: RankableCard[] = Array.from({ length: 80 }, (_, i) => ({
      cardId: `card-${String(i).padStart(3, '0')}`,
      setId: 'set-a',
      setTitle: 'A',
      reason: 'new' as const,
      dueDate: null,
      easeFactor: null,
    }));

    const { items, totalEligible } = rankAndCap(cards, now);
    expect(items.length).toBe(QUEUE_DEFAULT_LIMIT);
    expect(totalEligible).toBe(80);
  });

  it('Scenario: Limit clamp', () => {
    expect(clampQueueLimit(0)).toBe(1);
    expect(clampQueueLimit(999)).toBe(QUEUE_MAX_LIMIT);
    expect(clampQueueLimit(undefined)).toBe(QUEUE_DEFAULT_LIMIT);
  });

  it('Scenario: Public library cards not owned are excluded', async () => {
    const { getLearningQueue } = await import('@/server/services/learning/learning-queue');
    const { prisma } = await import('@/server/db');
    const spy = vi.spyOn(prisma.cardProgress, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([] as never);
    vi.spyOn(prisma.flashcard, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.flashcard, 'count').mockResolvedValue(0);

    await getLearningQueue('user-a', { now, limit: 10 });

    expect(spy).toHaveBeenCalled();
    const dueWhere = spy.mock.calls[0]?.[0]?.where as {
      userId: string;
      card: { set: { userId: string } };
    };
    expect(dueWhere.userId).toBe('user-a');
    expect(dueWhere.card.set.userId).toBe('user-a');
  });

  it('Scenario: Stale progress after set ownership change excluded', async () => {
    const { getLearningQueue } = await import('@/server/services/learning/learning-queue');
    const { prisma } = await import('@/server/db');

    // Defense-in-depth: even if a leaked unowned row arrives, it is dropped.
    vi.spyOn(prisma.cardProgress, 'findMany')
      .mockResolvedValueOnce([
        {
          cardId: 'stale-1',
          dueDate: new Date('2026-07-27T00:00:00.000Z'),
          easeFactor: 2.5,
          card: {
            id: 'stale-1',
            front: 'stale',
            setId: 'set-other',
            set: { id: 'set-other', title: 'Other', userId: 'user-b' },
          },
        },
      ] as never)
      .mockResolvedValueOnce([]); // weakByEase
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([] as never);
    vi.spyOn(prisma.flashcard, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.flashcard, 'count').mockResolvedValue(0);

    const result = await getLearningQueue('user-a', { now, limit: 10 });
    expect(result.items.find((i) => i.cardId === 'stale-1')).toBeUndefined();
    expect(result.totalEligible).toBe(0);
    expect(result.membershipForInsights).toEqual([]);
  });

  it('Scenario: weakSets membership uncapped vs queue limit', async () => {
    const { getLearningQueue } = await import('@/server/services/learning/learning-queue');
    const { prisma } = await import('@/server/db');

    const dueRows = Array.from({ length: 40 }, (_, i) => ({
      cardId: `due-${i}`,
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      easeFactor: 2.5,
      card: {
        id: `due-${i}`,
        front: `f-${i}`,
        setId: 'set-a',
        set: { id: 'set-a', title: 'A', userId: 'user-a' },
      },
    }));

    vi.spyOn(prisma.cardProgress, 'findMany')
      .mockResolvedValueOnce(dueRows as never) // due
      .mockResolvedValueOnce([]); // weakByEase
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([] as never);
    vi.spyOn(prisma.flashcard, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.flashcard, 'count').mockResolvedValue(0);

    const result = await getLearningQueue('user-a', { now, limit: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.totalEligible).toBe(40);
    expect(result.membershipForInsights).toHaveLength(40);
    expect(result.membershipForInsights.every((i) => i.reason === 'due')).toBe(true);
  });

  it('loads at most `limit` new cards but counts all of them as eligible', async () => {
    const { getLearningQueue } = await import('@/server/services/learning/learning-queue');
    const { prisma } = await import('@/server/db');

    const progressSpy = vi.spyOn(prisma.cardProgress, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([
      { cardId: 'fail-1', grade: 'AGAIN', front: 'f', setId: 'set-a', setTitle: 'A' },
      { cardId: 'ok-1', grade: 'GOOD', front: 'g', setId: 'set-a', setTitle: 'A' },
    ] as never);
    const newRows = Array.from({ length: 10 }, (_, i) => ({
      id: `new-${i}`,
      front: `n-${i}`,
      setId: 'set-a',
      set: { title: 'A' },
    }));
    const newSpy = vi.spyOn(prisma.flashcard, 'findMany').mockResolvedValue(newRows as never);
    vi.spyOn(prisma.flashcard, 'count').mockResolvedValue(500);

    const result = await getLearningQueue('user-a', { now, limit: 10 });

    const newArgs = newSpy.mock.calls[0]?.[0] as { take: number; where: unknown };
    expect(newArgs.take).toBe(10);
    expect(newArgs.where).toEqual({
      set: { userId: 'user-a' },
      progress: { none: { userId: 'user-a' } },
      id: { notIn: ['fail-1'] },
    });
    // weak-by-ease excludes due cards by dueDate rather than a NOT IN id list
    const weakWhere = progressSpy.mock.calls[1]?.[0]?.where as { dueDate: unknown };
    expect(weakWhere.dueDate).toEqual({ gt: now });
    // 1 recent fail + 500 new
    expect(result.totalEligible).toBe(501);
    expect(result.items).toHaveLength(10);
    expect(result.items.some((item) => item.cardId === 'fail-1')).toBe(true);
    expect(result.items.some((item) => item.cardId === 'ok-1')).toBe(false);
  });
});
