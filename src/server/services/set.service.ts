import type { Prisma, Visibility } from '@prisma/client';
import { unstable_cache, revalidateTag } from 'next/cache';
import { ApiError } from '@/lib/api-error';
import type {
  CreateSetInput,
  ListSetsQuery,
  UpdateSetInput,
} from '@/features/sets/schemas/set.schema';
import { prisma } from '@/server/db';

const setInclude = {
  tags: { include: { tag: true } },
  _count: { select: { cards: true } },
} satisfies Prisma.FlashcardSetInclude;

export type SetWithMeta = Prisma.FlashcardSetGetPayload<{ include: typeof setInclude }>;

const assertOwner = (set: { userId: string }, userId: string) => {
  if (set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this set', 403);
  }
};

const assertReadable = (set: { userId: string; visibility: Visibility }, userId?: string) => {
  if (set.visibility === 'PUBLIC') {
    return;
  }
  if (!userId || set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'This set is private', 403);
  }
};

const invalidateSetCache = (userId: string, visibility: Visibility) => {
  revalidateTag(`sets-${userId}`);
  if (visibility === 'PUBLIC') {
    revalidateTag('public-sets');
  }
};

export async function getSets(userId: string, query: ListSetsQuery) {
  return unstable_cache(
    async () => {
      const where: Prisma.FlashcardSetWhereInput = {
        userId,
        ...(query.visibility ? { visibility: query.visibility } : {}),
        ...(query.language ? { language: query.language } : {}),
        ...(query.folderId ? { folders: { some: { folderId: query.folderId } } } : {}),
      };

      const sets = await prisma.flashcardSet.findMany({
        where,
        include: setInclude,
        take: query.limit + 1,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      const hasMore = sets.length > query.limit;
      const data = hasMore ? sets.slice(0, -1) : sets;

      return {
        data,
        pagination: {
          nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
          hasMore,
        },
      };
    },
    ['user-sets', userId, JSON.stringify(query)],
    { tags: [`sets-${userId}`], revalidate: 3600 }
  )();
}

export async function getSet(setId: string, userId?: string) {
  const set = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: setInclude,
  });

  if (!set) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }

  assertReadable(set, userId);
  return set;
}

export async function createSet(userId: string, input: CreateSetInput) {
  const set = await prisma.flashcardSet.create({
    data: {
      title: input.title,
      description: input.description,
      language: input.language,
      visibility: input.visibility,
      userId,
      ...(input.tagIds?.length
        ? {
            tags: {
              create: input.tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: setInclude,
  });

  invalidateSetCache(userId, set.visibility);
  return set;
}

export async function updateSet(setId: string, userId: string, input: UpdateSetInput) {
  const existing = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  assertOwner(existing, userId);

  const tagUpdate =
    input.tagIds === undefined
      ? {}
      : {
          tags: {
            deleteMany: {},
            create: input.tagIds.map((tagId) => ({ tagId })),
          },
        };

  return prisma.flashcardSet.update({
    where: { id: setId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...tagUpdate,
    },
    include: setInclude,
  });

  invalidateSetCache(userId, set.visibility);
  // Also invalidate if it was previously public and is now private
  if (existing.visibility === 'PUBLIC' && set.visibility !== 'PUBLIC') {
    revalidateTag('public-sets');
  }
  return set;
}

export async function deleteSet(setId: string, userId: string) {
  const existing = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  assertOwner(existing, userId);
  await prisma.flashcardSet.delete({ where: { id: setId } });
  invalidateSetCache(userId, existing.visibility);
}

export async function duplicateSet(setId: string, userId: string) {
  const source = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: { cards: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!source) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }

  assertReadable(source, userId);

  return prisma.flashcardSet.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      language: source.language,
      visibility: 'PRIVATE',
      coverImage: source.coverImage,
      userId,
      cards: {
        create: source.cards.map((card, index) => ({
          front: card.front,
          back: card.back,
          example: card.example,
          imageUrl: card.imageUrl,
          audioUrl: card.audioUrl,
          sortOrder: index,
        })),
      },
    },
    include: setInclude,
  });

  invalidateSetCache(userId, set.visibility);
  return set;
}
