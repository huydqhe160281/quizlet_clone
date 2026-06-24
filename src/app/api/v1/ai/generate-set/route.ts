import { withErrorHandler } from '@/lib/api-error';
import { assertAiGenerateRateLimit } from '@/lib/ai-rate-limit-guard';
import { aiGenerateInputSchema } from '@/features/sets/schemas/ai-generate.schema';
import { requireUserId } from '@/server/auth-utils';
import { generateAiSet } from '@/server/services/ai-set.service';

export const maxDuration = 120;

export const POST = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  assertAiGenerateRateLimit(userId);
  const body = await req.json();
  const input = aiGenerateInputSchema.parse(body);
  const set = await generateAiSet(userId, input);

  return Response.json(
    {
      data: {
        set: {
          id: set.id,
          title: set.title,
          description: set.description,
          visibility: set.visibility,
        },
        cards: set.cards.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          example: card.example,
          sortOrder: card.sortOrder,
        })),
      },
    },
    { status: 201 }
  );
});
