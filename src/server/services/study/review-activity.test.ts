import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  reviewHistory: { count: vi.fn() },
  sessionCard: { count: vi.fn() },
  reviewActivityArchive: { aggregate: vi.fn() },
  $executeRaw: vi.fn(),
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));

import {
  archiveReviewActivity,
  countReviewActivity,
} from '@/server/services/study/review-activity';

function lastSql() {
  const [strings, ...values] = prismaMock.$executeRaw.mock.calls.at(-1) as [
    TemplateStringsArray,
    ...unknown[],
  ];
  return Prisma.sql(strings, ...values);
}

describe('countReviewActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reviewHistory.count.mockResolvedValue(10);
    prismaMock.sessionCard.count.mockResolvedValue(5);
  });

  it('adds reviews archived from deleted sets to the live counts', async () => {
    prismaMock.reviewActivityArchive.aggregate.mockResolvedValue({ _sum: { count: 100 } });

    await expect(countReviewActivity('user-a')).resolves.toBe(115);
    expect(prismaMock.reviewActivityArchive.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-a' },
      _sum: { count: true },
    });
  });

  it('treats an empty archive as zero', async () => {
    prismaMock.reviewActivityArchive.aggregate.mockResolvedValue({ _sum: { count: null } });

    await expect(countReviewActivity('user-a')).resolves.toBe(15);
  });
});

describe('archiveReviewActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$executeRaw.mockReturnValue('archive-op');
  });

  it('archives reviews and session answers of whole sets, per user and UTC day', () => {
    expect(archiveReviewActivity({ setIds: ['set-1', 'set-2'] })).toBe('archive-op');

    const sql = lastSql();
    expect(sql.sql).toContain('INSERT INTO "review_activity_archive"');
    expect(sql.sql).toContain('FROM "review_history" rh');
    expect(sql.sql).toContain('FROM "session_cards" sc');
    expect(sql.sql).toContain('sc."answeredAt" IS NOT NULL');
    // Sessions on a deleted set cascade away too, not only answers on its cards.
    expect(sql.sql).toContain('ss."setId" = ANY(');
    expect(sql.sql).toContain('GROUP BY 1, 2');
    // Archiving twice into one day adds up instead of failing or overwriting.
    expect(sql.sql).toMatch(
      /ON CONFLICT \("userId", "day"\)\s+DO UPDATE SET "count" = "review_activity_archive"\."count" \+ EXCLUDED\."count"/
    );
    expect(sql.values).toEqual([
      ['set-1', 'set-2'],
      ['set-1', 'set-2'],
      ['set-1', 'set-2'],
    ]);
  });

  it('archives only the given cards of a set', () => {
    archiveReviewActivity({ setId: 'set-1', cardIds: ['card-1'] });

    const sql = lastSql();
    expect(sql.sql).toContain('f.id = ANY(');
    expect(sql.sql).not.toContain('ss."setId"');
    expect(sql.values).toEqual(['set-1', ['card-1'], 'set-1', ['card-1']]);
  });
});
