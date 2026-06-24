import { ApiError } from '@/lib/api-error';
import { revalidateTag } from 'next/cache';
import type { Visibility } from '@prisma/client';
import type { CreateCardInput, UpdateCardInput } from '@/features/cards/schemas/card.schema';
import { prisma } from '@/server/db';

const getOwnedSet = async (setId: string, userId: string) => {
  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!set) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  if (set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this set', 403);
  }
  return set as typeof set & { visibility: Visibility };
};

const invalidateSetCache = (userId: string, visibility: Visibility) => {
  revalidateTag(`sets-${userId}`);
  if (visibility === 'PUBLIC') {
    revalidateTag('public-sets');
  }
};

export async function getCards(setId: string, userId?: string) {
  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  if (!set) {
    throw new ApiError('NOT_FOUND', 'Set not found', 404);
  }
  if (set.visibility === 'PRIVATE' && set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'This set is private', 403);
  }

  return prisma.flashcard.findMany({
    where: { setId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createCard(setId: string, userId: string, input: CreateCardInput) {
  const set = await getOwnedSet(setId, userId);

  const maxOrder = await prisma.flashcard.aggregate({
    where: { setId },
    _max: { sortOrder: true },
  });

  const card = await prisma.flashcard.create({
    data: {
      setId,
      front: input.front,
      back: input.back,
      example: input.example,
      imageUrl: input.imageUrl,
      audioUrl: input.audioUrl,
      type: input.type ?? null,
      sortOrder: input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  invalidateSetCache(userId, set.visibility);
  return card;
}

export async function updateCard(
  setId: string,
  cardId: string,
  userId: string,
  input: UpdateCardInput
) {
  const set = await getOwnedSet(setId, userId);

  const card = await prisma.flashcard.findFirst({ where: { id: cardId, setId } });
  if (!card) {
    throw new ApiError('NOT_FOUND', 'Card not found', 404);
  }

  const updatedCard = await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      ...(input.front !== undefined ? { front: input.front } : {}),
      ...(input.back !== undefined ? { back: input.back } : {}),
      ...(input.example !== undefined ? { example: input.example } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.audioUrl !== undefined ? { audioUrl: input.audioUrl } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
  });

  invalidateSetCache(userId, set.visibility);
  return updatedCard;
}

export async function deleteCard(setId: string, cardId: string, userId: string) {
  const set = await getOwnedSet(setId, userId);

  const card = await prisma.flashcard.findFirst({ where: { id: cardId, setId } });
  if (!card) {
    throw new ApiError('NOT_FOUND', 'Card not found', 404);
  }

  await prisma.flashcard.delete({ where: { id: cardId } });
  invalidateSetCache(userId, set.visibility);
}

export async function reorderCards(setId: string, userId: string, cardIds: string[]) {
  const set = await getOwnedSet(setId, userId);

  const cards = await prisma.flashcard.findMany({
    where: { setId },
    select: { id: true },
  });

  if (cards.length !== cardIds.length) {
    throw new ApiError('VALIDATION_ERROR', 'Card list mismatch', 400);
  }

  const existingIds = new Set(cards.map((card) => card.id));
  if (cardIds.some((id) => !existingIds.has(id))) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid card id in reorder list', 400);
  }

  await prisma.$transaction(
    cardIds.map((id, index) =>
      prisma.flashcard.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  invalidateSetCache(userId, set.visibility);

  return prisma.flashcard.findMany({
    where: { setId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function deleteCards(setId: string, cardIds: string[], userId: string) {
  const set = await getOwnedSet(setId, userId);

  await prisma.flashcard.deleteMany({
    where: {
      setId,
      id: { in: cardIds },
    },
  });

  invalidateSetCache(userId, set.visibility);
}
