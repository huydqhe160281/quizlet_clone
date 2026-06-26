import { withErrorHandler } from '@/lib/api-error';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { reorderCardsSchema } from '@/features/sets/cards/schemas/card.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { reorderCards } from '@/server/services/sets/card.service';

export const POST = withErrorHandler(async (req, { params }) => {
  assertApiRateLimit(req);
  const { setId } = await params;
  const userId = await requireUserId();
  const body = await req.json();
  const { cardIds } = reorderCardsSchema.parse(body);
  const cards = await reorderCards(setId, userId, cardIds);
  return Response.json({ data: cards });
});
