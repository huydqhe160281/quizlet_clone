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

type SearchCursorPayload = {
  v: 1;
  kind: 'search';
  rank: number;
  createdAt: string;
  id: string;
};

type NewestCursorPayload = {
  v: 1;
  kind: 'newest';
  createdAt: string;
  id: string;
};

type MostStudiedCursorPayload = {
  v: 1;
  kind: 'most_studied';
  studyCount: number;
  id: string;
};

type TrendingCursorPayload = {
  v: 1;
  kind: 'trending';
  studyCount: number;
  lastStartedAt: string;
  id: string;
};

const encodeCursor = (
  payload:
    | SearchCursorPayload
    | NewestCursorPayload
    | MostStudiedCursorPayload
    | TrendingCursorPayload
) => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

function decodeCursor<T extends { v: 1; kind: string }>(
  cursor: string,
  expectedKind: T['kind']
): T {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
    if (parsed?.v !== 1 || parsed?.kind !== expectedKind) {
      throw new Error('Invalid cursor shape');
    }
    return parsed;
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Invalid cursor', 400);
  }
}

function parseCursorDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid cursor', 400);
  }
  return date;
}

const asNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed)) {
    throw new ApiError('INTERNAL_ERROR', 'Invalid ranking value', 500);
  }
  return parsed;
};

const paginateRows = <T>(rows: T[], limit: number, toCursor: (row: T) => string) => {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return {
    data,
    pagination: {
      nextCursor: hasMore ? toCursor(data[data.length - 1] as T) : null,
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
  const rankExpr = Prisma.sql`ts_rank(search_vector, plainto_tsquery('english', ${query.q}))`;
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

  const cursor = query.cursor ? decodeCursor<SearchCursorPayload>(query.cursor, 'search') : null;
  const cursorCreatedAt = cursor ? parseCursorDate(cursor.createdAt) : null;
  const cursorFilter =
    cursor && cursorCreatedAt
      ? Prisma.sql`AND (
          ${rankExpr} < ${cursor.rank}
          OR (
            ${rankExpr} = ${cursor.rank}
            AND (
              "createdAt" < ${cursorCreatedAt}
              OR ("createdAt" = ${cursorCreatedAt} AND id < ${cursor.id})
            )
          )
        )`
      : Prisma.empty;

  // Prefer FTS (GIN). Prefix title match; include own sets when authenticated (spec).
  const rows = await prisma.$queryRaw<
    Array<{ id: string; createdAt: Date; rank: unknown }>
  >(Prisma.sql`
    SELECT id, "createdAt", ${rankExpr} AS rank
    FROM flashcard_sets fs
    WHERE ${visibilityFilter}
      AND (
        search_vector @@ plainto_tsquery('english', ${query.q})
        OR title ILIKE ${query.q + '%'}
      )
      ${languageFilter}
      ${tagFilter}
      ${cursorFilter}
    ORDER BY ${rankExpr} DESC, "createdAt" DESC, id DESC
    LIMIT ${limit}
  `);

  const page = paginateRows(rows, query.limit, (row) =>
    encodeCursor({
      v: 1,
      kind: 'search',
      rank: asNumber(row.rank),
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    })
  );
  const hydrated = await hydrateSetsByIds(
    page.data.map((row) => row.id),
    userId
  );
  return { data: hydrated, pagination: page.pagination };
}

export async function getPublicLibrary(query: LibraryQuery) {
  const take = query.limit + 1;
  const languageFilter = query.language
    ? Prisma.sql`AND fs.language = ${query.language}`
    : Prisma.empty;
  const tagFilter = query.tagId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM set_tags st
        WHERE st."setId" = fs.id AND st."tagId" = ${query.tagId}
      )`
    : Prisma.empty;

  if (query.sort === 'most_studied') {
    const cursor = query.cursor
      ? decodeCursor<MostStudiedCursorPayload>(query.cursor, 'most_studied')
      : null;
    const cursorFilter = cursor
      ? Prisma.sql`HAVING COUNT(ss.id) < ${cursor.studyCount}
          OR (COUNT(ss.id) = ${cursor.studyCount} AND fs.id < ${cursor.id})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{ id: string; study_count: unknown }>>(Prisma.sql`
      SELECT fs.id, COUNT(ss.id)::int AS study_count
      FROM flashcard_sets fs
      LEFT JOIN study_sessions ss ON ss."setId" = fs.id
      WHERE fs.visibility = 'PUBLIC'::"Visibility"
        ${languageFilter}
        ${tagFilter}
      GROUP BY fs.id
      ${cursorFilter}
      ORDER BY study_count DESC, fs.id DESC
      LIMIT ${take}
    `);

    const page = paginateRows(rows, query.limit, (row) =>
      encodeCursor({
        v: 1,
        kind: 'most_studied',
        studyCount: asNumber(row.study_count),
        id: row.id,
      })
    );
    const hydrated = await hydrateSetsByIds(page.data.map((row) => row.id));
    return { data: hydrated, pagination: page.pagination };
  }

  if (query.sort === 'trending') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cursor = query.cursor
      ? decodeCursor<TrendingCursorPayload>(query.cursor, 'trending')
      : null;
    const cursorLastStartedAt = cursor ? parseCursorDate(cursor.lastStartedAt) : null;
    const cursorFilter =
      cursor && cursorLastStartedAt
        ? Prisma.sql`HAVING COUNT(ss.id) < ${cursor.studyCount}
            OR (
              COUNT(ss.id) = ${cursor.studyCount}
              AND (
                MAX(ss."startedAt") < ${cursorLastStartedAt}
                OR (MAX(ss."startedAt") = ${cursorLastStartedAt} AND fs.id < ${cursor.id})
              )
            )`
        : Prisma.empty;

    const ranked = await prisma.$queryRaw<
      Array<{ id: string; study_count: unknown; last_started_at: Date }>
    >(Prisma.sql`
      SELECT fs.id, COUNT(ss.id)::int AS study_count, MAX(ss."startedAt") AS last_started_at
      FROM flashcard_sets fs
      INNER JOIN study_sessions ss
        ON ss."setId" = fs.id AND ss."startedAt" >= ${weekAgo}
      WHERE fs.visibility = 'PUBLIC'::"Visibility"
        ${languageFilter}
        ${tagFilter}
      GROUP BY fs.id
      ${cursorFilter}
      ORDER BY study_count DESC, last_started_at DESC, fs.id DESC
      LIMIT ${take}
    `);

    const page = paginateRows(ranked, query.limit, (row) =>
      encodeCursor({
        v: 1,
        kind: 'trending',
        studyCount: asNumber(row.study_count),
        lastStartedAt: row.last_started_at.toISOString(),
        id: row.id,
      })
    );
    const hydrated = await hydrateSetsByIds(page.data.map((row) => row.id));
    return { data: hydrated, pagination: page.pagination };
  }

  const cursor = query.cursor ? decodeCursor<NewestCursorPayload>(query.cursor, 'newest') : null;
  const cursorCreatedAt = cursor ? parseCursorDate(cursor.createdAt) : null;
  const cursorFilter =
    cursor && cursorCreatedAt
      ? Prisma.sql`AND (
          fs."createdAt" < ${cursorCreatedAt}
          OR (fs."createdAt" = ${cursorCreatedAt} AND fs.id < ${cursor.id})
        )`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>(Prisma.sql`
    SELECT fs.id, fs."createdAt"
    FROM flashcard_sets fs
    WHERE fs.visibility = 'PUBLIC'::"Visibility"
      ${languageFilter}
      ${tagFilter}
      ${cursorFilter}
    ORDER BY fs."createdAt" DESC, fs.id DESC
    LIMIT ${take}
  `);

  const page = paginateRows(rows, query.limit, (row) =>
    encodeCursor({
      v: 1,
      kind: 'newest',
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    })
  );
  const hydrated = await hydrateSetsByIds(page.data.map((row) => row.id));
  return { data: hydrated, pagination: page.pagination };
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
