import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { ApiError } from '@/lib/api-error';
import type {
  libraryQuerySchema,
  searchQuerySchema,
} from '@/features/search/schemas/search.schema';
import { prisma } from '@/server/db';
import type { z } from 'zod';

type SearchQuery = z.infer<typeof searchQuerySchema>;
type LibraryQuery = z.infer<typeof libraryQuerySchema>;

const libraryInclude = {
  _count: { select: { studySessions: true, cards: true } },
  tags: { include: { tag: true } },
} as const;

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

async function hydrateSetsByIds(ids: string[], userId?: string | null) {
  if (ids.length === 0) return [];
  const sets = await prisma.flashcardSet.findMany({
    where: {
      id: { in: ids },
      ...(userId
        ? { OR: [{ visibility: 'PUBLIC' as const }, { userId }] }
        : { visibility: 'PUBLIC' as const }),
    },
    include: libraryInclude,
  });
  const byId = new Map(sets.map((set) => [set.id, set]));
  return ids
    .map((id) => byId.get(id))
    .filter((set): set is NonNullable<typeof set> => Boolean(set));
}

export async function searchPublicSets(query: SearchQuery, userId?: string | null) {
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
  const visibilityFilter = userId
    ? Prisma.sql`(visibility = 'PUBLIC'::"Visibility" OR "userId" = ${userId})`
    : Prisma.sql`visibility = 'PUBLIC'::"Visibility"`;
  const cursorFilter = query.cursor
    ? Prisma.sql`AND (
        "createdAt" < (SELECT "createdAt" FROM flashcard_sets WHERE id = ${query.cursor})
        OR (
          "createdAt" = (SELECT "createdAt" FROM flashcard_sets WHERE id = ${query.cursor})
          AND id < ${query.cursor}
        )
      )`
    : Prisma.empty;

  // Prefer FTS (GIN). Prefix title match; include own sets when authenticated (spec).
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM flashcard_sets fs
    WHERE ${visibilityFilter}
      AND (
        search_vector @@ plainto_tsquery('english', ${query.q})
        OR title ILIKE ${query.q + '%'}
      )
      ${languageFilter}
      ${tagFilter}
      ${cursorFilter}
    ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query.q})) DESC, "createdAt" DESC, id DESC
    LIMIT ${limit}
  `);

  const hydrated = await hydrateSetsByIds(
    rows.map((row) => row.id),
    userId
  );
  return paginate(hydrated, query.limit);
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
      include: libraryInclude,
      orderBy: { studySessions: { _count: 'desc' } },
      take,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });
    return paginate(sets, query.limit);
  }

  if (query.sort === 'trending') {
    // Ranked window does not yet support keyset cursor; stop after first page.
    if (query.cursor) {
      return { data: [], pagination: { nextCursor: null, hasMore: false } };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const languageFilter = query.language
      ? Prisma.sql`AND fs.language = ${query.language}`
      : Prisma.empty;
    const tagFilter = query.tagId
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM set_tags st
          WHERE st."setId" = fs.id AND st."tagId" = ${query.tagId}
        )`
      : Prisma.empty;
    const ranked = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT fs.id
      FROM flashcard_sets fs
      INNER JOIN study_sessions ss
        ON ss."setId" = fs.id AND ss."startedAt" >= ${weekAgo}
      WHERE fs.visibility = 'PUBLIC'::"Visibility"
        ${languageFilter}
        ${tagFilter}
      GROUP BY fs.id
      ORDER BY COUNT(ss.id) DESC, MAX(ss."startedAt") DESC, fs.id DESC
      LIMIT ${take}
    `);

    const hydrated = await hydrateSetsByIds(ranked.map((row) => row.id));
    return paginate(hydrated, query.limit);
  }

  const sets = await prisma.flashcardSet.findMany({
    where,
    include: libraryInclude,
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

export const getCachedPublicLibrary = async (query: LibraryQuery) => {
  return unstable_cache(
    async () => getPublicLibrary(query),
    ['public-library', JSON.stringify(query)],
    { tags: ['public-sets'], revalidate: 3600 }
  )();
};

export const getCachedSearchPublicSets = async (query: SearchQuery, userId?: string | null) => {
  // User-scoped results must not share the anonymous public cache entry.
  if (userId) {
    return searchPublicSets(query, userId);
  }
  return unstable_cache(
    async () => searchPublicSets(query),
    ['public-search', JSON.stringify(query)],
    { tags: ['public-sets'], revalidate: 3600 }
  )();
};

export const getCachedPublicSetPreview = async (setId: string) => {
  return unstable_cache(async () => getPublicSetPreview(setId), ['public-set-preview', setId], {
    tags: ['public-sets', `public-set-${setId}`],
    revalidate: 300,
  })();
};

const SITEMAP_PUBLIC_SET_LIMIT = 5000;

export async function getPublicSetSitemapEntries(limit = SITEMAP_PUBLIC_SET_LIMIT) {
  return prisma.flashcardSet.findMany({
    where: { visibility: 'PUBLIC' },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}
