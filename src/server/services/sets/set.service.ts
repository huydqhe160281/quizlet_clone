import type { Prisma, Visibility } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { ApiError } from '@/lib/api-error';
import type {
  CreateSetInput,
  ListSetsQuery,
  MergeSetsInput,
  UpdateSetInput,
} from '@/features/sets/schemas/set.schema';
import {
  MAX_MERGED_CARDS,
  MIN_MERGE_SETS,
  MAX_SPLIT_PARTS,
} from '@/features/sets/schemas/set.schema';
import { assertCanPublish } from '@/server/auth/email-verified';
import { prisma } from '@/server/db';
import { invalidateSetCache } from '@/server/services/sets/set-cache';
import { SET_TITLE_MAX } from '@/features/sets/schemas/set.schema';

export const SPLIT_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

function splitPartTitle(sourceTitle: string, partIndex: number, partCount: number): string {
  const suffix = ` (${partIndex + 1}/${partCount})`;
  const maxBase = SET_TITLE_MAX - suffix.length;
  const base =
    sourceTitle.length > maxBase ? sourceTitle.slice(0, Math.max(maxBase, 0)) : sourceTitle;
  return `${base}${suffix}`;
}

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
  if (input.visibility === 'PUBLIC') await assertCanPublish(userId);
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
  if (input.visibility === 'PUBLIC' && existing.visibility !== 'PUBLIC') {
    await assertCanPublish(userId);
  }

  const tagUpdate =
    input.tagIds === undefined
      ? {}
      : {
          tags: {
            deleteMany: {},
            create: input.tagIds.map((tagId) => ({ tagId })),
          },
        };

  const set = await prisma.flashcardSet.update({
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

  invalidateSetCache(userId, set.visibility, { setId });
  if (existing.visibility === 'PUBLIC' && set.visibility !== 'PUBLIC') {
    // Made private: drop it from public lists and its public preview.
    invalidateSetCache(userId, 'PUBLIC', { setId });
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
  invalidateSetCache(userId, existing.visibility, { setId });
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

  const set = await prisma.flashcardSet.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      language: source.language,
      visibility: 'PRIVATE',
      coverImage: source.coverImage,
      userId,
      cards: {
        // createMany: one INSERT for all cards instead of one per card.
        createMany: {
          data: source.cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            example: card.example,
            imageUrl: card.imageUrl,
            audioUrl: card.audioUrl,
            type: card.type,
            sortOrder: index,
          })),
        },
      },
    },
    include: setInclude,
  });

  invalidateSetCache(userId, set.visibility);
  return set;
}

export async function splitSet(setId: string, userId: string, chunkSize: number) {
  const source = await prisma.flashcardSet.findUnique({
    where: { id: setId },
    include: { cards: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!source) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }

  assertOwner(source, userId);

  const totalCards = source.cards.length;
  if (totalCards === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Set has no cards to split', 400);
  }

  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new ApiError('VALIDATION_ERROR', 'chunkSize must be a positive integer', 400);
  }

  if (chunkSize >= totalCards) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'chunkSize must be less than the total number of cards',
      400
    );
  }

  const partCount = Math.ceil(totalCards / chunkSize);
  if (partCount > MAX_SPLIT_PARTS) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `Split would create more than ${MAX_SPLIT_PARTS} sets`,
      400
    );
  }

  const sets = await prisma.$transaction(async (tx) => {
    const created: SetWithMeta[] = [];
    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const chunk = source.cards.slice(partIndex * chunkSize, (partIndex + 1) * chunkSize);
      const set = await tx.flashcardSet.create({
        data: {
          title: splitPartTitle(source.title, partIndex, partCount),
          description: source.description,
          language: source.language,
          visibility: 'PRIVATE',
          coverImage: source.coverImage,
          userId,
          cards: {
            createMany: {
              data: chunk.map((card, index) => ({
                front: card.front,
                back: card.back,
                example: card.example,
                imageUrl: card.imageUrl,
                audioUrl: card.audioUrl,
                type: card.type,
                sortOrder: index,
              })),
            },
          },
        },
        include: setInclude,
      });
      created.push(set);
    }
    return created;
    // Up to MAX_SPLIT_PARTS sequential inserts: Prisma's 5s default is too tight.
  }, SPLIT_TRANSACTION_OPTIONS);

  invalidateSetCache(userId, 'PRIVATE');
  return sets;
}

/** Same front + back ignoring surrounding whitespace, case and Unicode composition. */
function mergeDuplicateKey(card: { front: string; back: string }): string {
  const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase();
  return `${normalize(card.front)}\u0000${normalize(card.back)}`;
}

/**
 * Copies the cards of several owned sets into one new private set, in the order the
 * sets were given. The copies start with fresh SM-2 progress like duplicate/split. Source
 * sets are left untouched unless `deleteSources` is set, in which case they are deleted in
 * the same transaction that creates the merged set.
 */
export async function mergeSets(userId: string, input: MergeSetsInput) {
  const setIds = [...new Set(input.setIds)];
  if (setIds.length < MIN_MERGE_SETS) {
    throw new ApiError('VALIDATION_ERROR', `Select at least ${MIN_MERGE_SETS} different sets`, 400);
  }

  const sources = await prisma.flashcardSet.findMany({
    where: { id: { in: setIds } },
    include: { cards: { orderBy: { sortOrder: 'asc' } } },
  });
  if (sources.length !== setIds.length) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  sources.forEach((source) => assertOwner(source, userId));

  const byId = new Map(sources.map((source) => [source.id, source]));
  const ordered = setIds.map((id) => byId.get(id)!);

  const seen = new Set<string>();
  let duplicatesSkipped = 0;
  const cards = ordered
    .flatMap((source) => source.cards)
    .filter((card) => {
      if (!input.removeDuplicates) {
        return true;
      }
      const key = mergeDuplicateKey(card);
      if (seen.has(key)) {
        duplicatesSkipped += 1;
        return false;
      }
      seen.add(key);
      return true;
    });

  if (cards.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Selected sets have no cards to merge', 400);
  }
  if (cards.length > MAX_MERGED_CARDS) {
    throw new ApiError(
      'CARD_LIMIT_EXCEEDED',
      `A merged set can hold at most ${MAX_MERGED_CARDS} cards`,
      400
    );
  }

  const languages = new Set(ordered.map((source) => source.language));
  const createMerged = prisma.flashcardSet.create({
    data: {
      title: input.title,
      description: input.description || null,
      language: languages.size === 1 ? ordered[0]!.language : null,
      visibility: 'PRIVATE',
      userId,
      cards: {
        createMany: {
          data: cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            example: card.example,
            imageUrl: card.imageUrl,
            audioUrl: card.audioUrl,
            type: card.type,
            sortOrder: index,
          })),
        },
      },
    },
    include: setInclude,
  });
  const [set] = input.deleteSources
    ? await prisma.$transaction([
        createMerged,
        prisma.flashcardSet.deleteMany({ where: { id: { in: setIds }, userId } }),
      ])
    : [await createMerged];

  invalidateSetCache(userId, set.visibility);
  if (input.deleteSources) {
    ordered.forEach((source) =>
      invalidateSetCache(userId, source.visibility, { setId: source.id })
    );
  }
  return { set, duplicatesSkipped };
}
