import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it, vi } from 'vitest';

// Runs only against a throwaway local Postgres with all migrations applied, e.g.
//   REVIEW_ARCHIVE_TEST_DATABASE_URL=postgresql://postgres:pg@localhost:55432/postgres \
//     pnpm vitest run src/server/services/study/review-archive.db.test.ts
// It writes and deletes users, so it refuses any non-local database.
const url = process.env.REVIEW_ARCHIVE_TEST_DATABASE_URL;
const isLocal = !!url && /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

const db = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock('@/server/db', () => ({
  get prisma() {
    return db.client;
  },
}));
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => () => fn(),
}));

import { deleteCard } from '@/server/services/sets/card.service';
import { deleteSet, mergeSets } from '@/server/services/sets/set.service';
import { countReviewActivity } from '@/server/services/study/review-activity';
import { getActivity } from '@/server/services/user/stats.service';

describe.skipIf(!isLocal)('review activity archive (real Postgres)', () => {
  const prisma = (db.client = isLocal ? new PrismaClient({ datasourceUrl: url }) : null)!;
  const userIds: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  const heatmapTotal = async (userId: string) =>
    (await getActivity(userId, 365)).reduce((sum, day) => sum + day.count, 0);

  it('keeps every user’s reviews through card, set and merge deletes, without double counting', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const owner = await prisma.user.create({ data: { email: `owner-${stamp}@example.test` } });
    const other = await prisma.user.create({ data: { email: `other-${stamp}@example.test` } });
    userIds.push(owner.id, other.id);

    const makeSet = (title: string) =>
      prisma.flashcardSet.create({
        data: {
          title,
          userId: owner.id,
          visibility: 'PUBLIC',
          cards: {
            create: [
              { front: 'a', back: 'b', sortOrder: 0 },
              { front: 'c', back: 'd', sortOrder: 1 },
            ],
          },
        },
        include: { cards: true },
      });
    const sets = [await makeSet('one'), await makeSet('two'), await makeSet('three')];
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const now = new Date();

    for (const set of sets) {
      for (const user of [owner, other]) {
        await prisma.reviewHistory.createMany({
          data: set.cards.flatMap((card) => [
            { userId: user.id, cardId: card.id, grade: 'GOOD' as const, reviewedAt: threeDaysAgo },
            { userId: user.id, cardId: card.id, grade: 'GOOD' as const, reviewedAt: now },
          ]),
        });
        await prisma.studySession.create({
          data: {
            userId: user.id,
            setId: set.id,
            mode: 'FLASHCARD',
            sessionCards: {
              create: [
                { cardId: set.cards[0]!.id, answeredAt: threeDaysAgo },
                { cardId: set.cards[1]!.id, answeredAt: null },
              ],
            },
          },
        });
      }
    }
    // Per user and set: 4 reviews + 1 answered card.
    for (const user of [owner, other]) {
      expect(await heatmapTotal(user.id)).toBe(15);
    }

    await deleteCard(sets[0]!.id, sets[0]!.cards[0]!.id, owner.id);
    await deleteSet(sets[0]!.id, owner.id);
    await mergeSets(owner.id, {
      setIds: [sets[1]!.id, sets[2]!.id],
      title: 'merged',
      removeDuplicates: false,
      deleteSources: true,
    });

    expect(await prisma.reviewHistory.count({ where: { userId: { in: userIds } } })).toBe(0);
    for (const user of [owner, other]) {
      expect(await heatmapTotal(user.id)).toBe(15);
      expect(await countReviewActivity(user.id)).toBe(15);
      const days = await prisma.reviewActivityArchive.findMany({
        where: { userId: user.id },
        orderBy: { day: 'asc' },
      });
      expect(days.map((day) => day.count)).toEqual([9, 6]);
    }
  });

  it('drops the archive with the user instead of failing the delete', async () => {
    const user = await prisma.user.create({
      data: { email: `gone-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test` },
    });
    const set = await prisma.flashcardSet.create({
      data: { title: 'x', userId: user.id, cards: { create: [{ front: 'a', back: 'b' }] } },
      include: { cards: true },
    });
    await prisma.reviewHistory.create({
      data: { userId: user.id, cardId: set.cards[0]!.id, grade: 'GOOD' },
    });
    await prisma.studySession.create({
      data: {
        userId: user.id,
        setId: set.id,
        mode: 'LEARN',
        sessionCards: { create: [{ cardId: set.cards[0]!.id, answeredAt: new Date() }] },
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.reviewActivityArchive.count({ where: { userId: user.id } })).toBe(0);
  });
});
