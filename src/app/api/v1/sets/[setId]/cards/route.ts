import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { createCardSchema } from '@/features/sets/cards/schemas/card.schema';
import { auth } from '@/server/auth/auth';
import { requireUserId } from '@/server/auth/auth-utils';
import { createCard, getCards, deleteCards } from '@/server/services/sets/card.service';

export const GET = withErrorHandler(async (_req, { params }) => {
  const { setId } = await params;
  const session = await auth();
  const cards = await getCards(setId, session?.user?.id);
  return Response.json({ data: cards });
});

export const POST = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const input = createCardSchema.parse(body);
  const card = await createCard(setId, userId, input);
  return Response.json({ data: card }, { status: 201 });
});

export const DELETE = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const { cardIds } = body;
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'cardIds must be a non-empty array' },
      { status: 400 }
    );
  }
  await deleteCards(setId, cardIds, userId);
  return Response.json({ data: { deleted: true } });
});
