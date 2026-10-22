import { Visibility } from '@prisma/client';
import { generateText, Output } from 'ai';
import type { AiGenerateInput } from '@/features/sets/schemas/ai-generate.schema';
import {
  buildAiFlashcardOutputSchema,
  trimAiFlashcardOutput,
} from '@/features/sets/schemas/ai-generate.schema';
import { ApiError } from '@/lib/api-error';
import { getOllamaGenerateOptions, getOllamaModel, getOllamaLargeModel } from '@/server/ai/ollama';
import { getZaiModel } from '@/server/ai/zai';
import { withModelFallback, type ModelFallbackOptions } from '@/server/ai/with-fallback';
import { prisma } from '@/server/db';
import { invalidateSetCache } from '@/server/services/sets/set-cache';

const buildSystemPrompt = (cardCount?: number) =>
  `You are a flashcard generator. ${
    cardCount
      ? `Create exactly ${cardCount} high-quality flashcards from the user's input.`
      : "Create as many high-quality flashcards as needed from the user's input."
  }
If the input is a topic request, generate vocabulary or concepts for that topic.
If the input is a document or passage, extract key terms and concepts.
Each card must have a clear front (term/concept) and back (definition/translation).
Optionally include a practical example sentence.

Respond with JSON only using this shape:
{
  "title": "string",
  "description": "string",
  "cards": [{ "front": "string", "back": "string", "example": "string (optional)" }]
}`;

/** Per-attempt cap and overall budget, under the generate-set route's 120s maxDuration. */
export const AI_SET_FALLBACK_OPTIONS: ModelFallbackOptions = {
  maxAttempts: 2,
  attemptTimeoutMs: 45_000,
  totalBudgetMs: 100_000,
};

export async function generateAiSet(userId: string, input: AiGenerateInput) {
  const outputSchema = buildAiFlashcardOutputSchema(input.cardCount);
  const prompt = `${buildSystemPrompt(input.cardCount)}\n\nUser input:\n${input.prompt}`;
  const generateOptions = getOllamaGenerateOptions(input.cardCount);

  let generated;
  try {
    // Fallback cascade: Ollama primary → Ollama large → Z.ai
    // Each provider is retried up to 2 times before moving to the next. The cascade owns
    // retries (maxRetries: 0, otherwise each attempt retries 3x internally) and finishes
    // inside the route's 120s maxDuration.
    const result = await withModelFallback(
      [
        ['ollama-primary', getOllamaModel(input.cardCount)],
        ['ollama-large', getOllamaLargeModel(input.cardCount)],
        ['zai', getZaiModel()],
      ],
      (model, abortSignal) =>
        generateText({
          model,
          ...generateOptions,
          output: Output.json(),
          prompt,
          maxRetries: 0,
          abortSignal,
        }),
      AI_SET_FALLBACK_OPTIONS
    );

    const parsed = outputSchema.safeParse(trimAiFlashcardOutput(result.output, input.cardCount));
    if (!parsed.success) {
      throw parsed.error;
    }
    generated = parsed.data;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[generateAiSet] All AI providers failed:', error);
    }
    throw new ApiError('AI_GENERATION_FAILED', 'Failed to generate flashcards from AI', 502);
  }

  const cards = generated.cards;

  const set = await prisma.flashcardSet.create({
    data: {
      title: generated.title,
      description: generated.description,
      visibility: Visibility.PRIVATE,
      userId,
      cards: {
        createMany: {
          data: cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            example: card.example ?? null,
            sortOrder: index,
          })),
        },
      },
    },
    include: {
      cards: { orderBy: { sortOrder: 'asc' } },
    },
  });

  invalidateSetCache(userId, 'PRIVATE');

  return set;
}
