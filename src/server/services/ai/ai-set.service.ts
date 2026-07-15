import { Visibility } from '@prisma/client';
import { generateText, Output } from 'ai';
import { revalidateTag } from 'next/cache';
import type { AiGenerateInput } from '@/features/sets/schemas/ai-generate.schema';
import {
  buildAiFlashcardOutputSchema,
  trimAiFlashcardOutput,
} from '@/features/sets/schemas/ai-generate.schema';
import { ApiError } from '@/lib/api-error';
import { getOllamaGenerateOptions, getOllamaModel, getOllamaLargeModel } from '@/server/ai/ollama';
import { getZaiModel } from '@/server/ai/zai';
import { withModelFallback } from '@/server/ai/with-fallback';
import { prisma } from '@/server/db';

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

export async function generateAiSet(userId: string, input: AiGenerateInput) {
  const outputSchema = buildAiFlashcardOutputSchema(input.cardCount);
  const prompt = `${buildSystemPrompt(input.cardCount)}\n\nUser input:\n${input.prompt}`;
  const generateOptions = getOllamaGenerateOptions(input.cardCount);

  let generated;
  try {
    // Fallback cascade: Ollama primary → Ollama large → Z.ai
    // Each provider is retried up to 2 times before moving to the next.
    const result = await withModelFallback(
      [
        ['ollama-primary', getOllamaModel(input.cardCount)],
        ['ollama-large', getOllamaLargeModel(input.cardCount)],
        ['zai', getZaiModel()],
      ],
      (model) =>
        generateText({
          model,
          ...generateOptions,
          output: Output.json(),
          prompt,
        }),
      2 // max attempts per provider
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
        create: cards.map((card, index) => ({
          front: card.front,
          back: card.back,
          example: card.example ?? null,
          sortOrder: index,
        })),
      },
    },
    include: {
      cards: { orderBy: { sortOrder: 'asc' } },
    },
  });

  revalidateTag(`sets-${userId}`);

  return set;
}
