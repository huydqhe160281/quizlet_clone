import { withErrorHandler } from '@/lib/api-error';
import { assertAiGenerateRateLimit } from '@/lib/rate-limit/ai-rate-limit-guard';
import { aiGenerateInputSchema } from '@/features/sets/schemas/ai-generate.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { hasVerifiedEmail } from '@/server/auth/email-verified';
import { generateAiSet } from '@/server/services/ai/ai-set.service';

export const maxDuration = 120;

export const POST = withErrorHandler(async (req) => {
  const userId = await requireUserId();
  const [emailVerified, body] = await Promise.all([hasVerifiedEmail(userId), req.json()]);
  const input = aiGenerateInputSchema.parse(body);
  const quota = await assertAiGenerateRateLimit(userId, { emailVerified });

  let set: Awaited<ReturnType<typeof generateAiSet>>;
  try {
    set = await generateAiSet(userId, input);
  } catch (error) {
    await quota.release();
    throw error;
  }

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
