import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { updateCardSchema } from '@/features/sets/cards/schemas/card.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { deleteCard, updateCard } from '@/server/services/sets/card.service';

export const PATCH = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId, cardId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const input = updateCardSchema.parse(body);
  const card = await updateCard(setId, cardId, userId, input);
  return Response.json({ data: card });
});

export const DELETE = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId, cardId } = await params;
  const userId = await requireUserId();
  await deleteCard(setId, cardId, userId);
  return Response.json({ data: { deleted: true } });
});
