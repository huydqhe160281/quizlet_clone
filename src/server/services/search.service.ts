import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api-error';
import type {
  libraryQuerySchema,
  searchQuerySchema,
} from '@/features/search/schemas/search.schema';
import { prisma } from '@/server/db';
import type { z } from 'zod';

type SearchQuery = z.infer<typeof searchQuerySchema>;
type LibraryQuery = z.infer<typeof libraryQuerySchema>;

const paginate = <T extends { id: string }>(items: T[], limit: number) => {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  return {
    data,
    pagination: {
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    },
  };
};

export async function searchPublicSets(query: SearchQuery) {
  const limit = query.limit + 1;
  const languageFilter = query.language
    ? Prisma.sql`AND language = ${query.language}`
    : Prisma.empty;
  const tagFilter = query.tagId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM set_tags st
        WHERE st."setId" = fs.id AND st."tagId" = ${query.tagId}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      language: string | null;
      createdAt: Date;
    }>
  >(Prisma.sql`
    SELECT id, title, description, language, "createdAt"
    FROM flashcard_sets fs
    WHERE visibility = 'PUBLIC'::"Visibility"
      AND (
        search_vector @@ plainto_tsquery('english', ${query.q})
        OR title ILIKE ${'%' + query.q + '%'}
        OR description ILIKE ${'%' + query.q + '%'}
      )
      ${languageFilter}
      ${tagFilter}
    ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query.q})) DESC, "createdAt" DESC
    LIMIT ${limit}
  `);

  const mapped = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    language: row.language,
    createdAt: row.createdAt,
  }));

  return paginate(mapped, query.limit);
}

export async function getPublicLibrary(query: LibraryQuery) {
  const take = query.limit + 1;
  const where = {
    visibility: 'PUBLIC' as const,
    ...(query.language ? { language: query.language } : {}),
    ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
  };

  if (query.sort === 'most_studied') {
    const sets = await prisma.flashcardSet.findMany({
      where,
      include: {
        _count: { select: { studySessions: true, cards: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { studySessions: { _count: 'desc' } },
      take,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });
    return paginate(sets, query.limit);
  }

  if (query.sort === 'trending') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sets = await prisma.flashcardSet.findMany({
      where: {
        ...where,
        studySessions: { some: { startedAt: { gte: weekAgo } } },
      },
      include: {
        _count: { select: { studySessions: true, cards: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });
    return paginate(sets, query.limit);
  }

  const sets = await prisma.flashcardSet.findMany({
    where,
    include: {
      _count: { select: { studySessions: true, cards: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
  });

  return paginate(sets, query.limit);
}

export async function getPublicSetPreview(setId: string) {
  const set = await prisma.flashcardSet.findUnique({
    where: { id: setId, visibility: 'PUBLIC' },
    include: {
      cards: { orderBy: { sortOrder: 'asc' }, take: 10 },
      tags: { include: { tag: true } },
      _count: { select: { cards: true, studySessions: true } },
      user: { select: { name: true } },
    },
  });

  if (!set) {
    throw new ApiError('NOT_FOUND', 'Public set not found', 404);
  }

  return set;
}
