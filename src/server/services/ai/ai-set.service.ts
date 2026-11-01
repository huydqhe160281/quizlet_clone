import { Visibility } from '@prisma/client';
import { generateText, Output } from 'ai';
import type { AiGenerateInput } from '@/features/sets/schemas/ai-generate.schema';
import {
  buildAiFlashcardOutputSchema,
  normalizeAiFlashcardOutput,
  trimAiFlashcardOutput,
} from '@/features/sets/schemas/ai-generate.schema';
import { ApiError } from '@/lib/api-error';
import { env } from '@/config/env';
import { getMotapiJsonModel } from '@/server/ai/motapi';
import { withModelSwitch, type ModelSwitchOptions } from '@/server/ai/model-switch';
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

/** Per-attempt cap and overall budget, under the generate-set route's maxDuration. */
export const AI_SET_SWITCH_OPTIONS: ModelSwitchOptions = {
  label: 'ai-set',
  // 200 cards take deepseek-v4-flash ~80s; the slower fallbacks need more.
  attemptTimeoutMs: 120_000,
  totalBudgetMs: 280_000,
};

/** Output token cap: room for the requested cards, bounded for the "no limit" case. */
export function maxOutputTokensFor(cardCount?: number): number {
  return Math.min((cardCount ?? 120) * 120 + 600, 16_000);
}

export async function generateAiSet(userId: string, input: AiGenerateInput) {
  const outputSchema = buildAiFlashcardOutputSchema(input.cardCount);
  const prompt = `${buildSystemPrompt(input.cardCount)}\n\nUser input:\n${input.prompt}`;

  let generated;
  try {
    // One call per model, at most 3 models: unparsable or empty output counts as a
    // failure and switches model. maxRetries: 0 — the SDK must not retry on its own.
    generated = await withModelSwitch(
      env.motapiSetModels,
      async (modelId, abortSignal) => {
        const result = await generateText({
          model: getMotapiJsonModel(modelId),
          temperature: 0,
          maxOutputTokens: maxOutputTokensFor(input.cardCount),
          output: Output.json(),
          prompt,
          maxRetries: 0,
          abortSignal,
        });
        const parsed = outputSchema.safeParse(
          trimAiFlashcardOutput(result.output, input.cardCount)
        );
        if (!parsed.success) {
          throw new Error(`Unexpected output shape: ${parsed.error.issues[0]?.message ?? ''}`);
        }
        const normalized = normalizeAiFlashcardOutput(parsed.data);
        if (!normalized) {
          throw new Error('AI returned no usable cards');
        }
        return normalized;
      },
      AI_SET_SWITCH_OPTIONS
    );
  } catch (error) {
    console.error(
      '[generateAiSet] all models failed:',
      error instanceof Error ? error.message : error
    );
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
