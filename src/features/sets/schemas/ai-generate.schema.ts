import { z } from 'zod';

const MAX_GENERATED_CARDS = 300;

export const aiGenerateInputSchema = z.object({
  prompt: z.string().trim().min(10).max(10000),
  cardCount: z.number().int().min(5).max(200).optional(),
});

export const aiFlashcardItemSchema = z.object({
  front: z.string().describe('Front of the card (term or concept)'),
  back: z.string().describe('Back of the card (definition or answer)'),
  example: z.string().optional().describe('Example sentence using the term'),
});

export const aiFlashcardOutputSchema = z.object({
  title: z.string().describe('Title for the flashcard set'),
  description: z.string().describe('Short description of the set'),
  cards: z.array(aiFlashcardItemSchema).max(MAX_GENERATED_CARDS),
});

export const buildAiFlashcardOutputSchema = (cardCount?: number) =>
  aiFlashcardOutputSchema.extend({
    cards: z
      .array(aiFlashcardItemSchema)
      .min(1)
      .max(cardCount ?? MAX_GENERATED_CARDS)
      .describe(
        cardCount
          ? `Target ${cardCount} flashcards; extra cards are trimmed server-side`
          : 'Generate as many useful flashcards as needed'
      ),
  });

export const trimAiFlashcardOutput = (output: unknown, cardCount?: number) => {
  if (!cardCount) {
    return output;
  }

  if (typeof output !== 'object' || output === null) {
    return output;
  }

  const record = output as Record<string, unknown>;
  if (!Array.isArray(record.cards)) {
    return output;
  }

  return {
    ...record,
    cards: record.cards.slice(0, cardCount),
  };
};

export type AiGenerateInput = z.infer<typeof aiGenerateInputSchema>;
export type AiFlashcardOutput = z.infer<typeof aiFlashcardOutputSchema>;
