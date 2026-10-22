import { z } from 'zod';
import {
  CARD_BACK_MAX,
  CARD_EXAMPLE_MAX,
  CARD_FRONT_MAX,
} from '@/features/sets/cards/schemas/card.schema';
import { SET_DESCRIPTION_MAX, SET_TITLE_MAX } from '@/features/sets/schemas/set.schema';

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

function clip(value: string, max: number): string {
  return value.trim().slice(0, max).trim();
}

/**
 * Model output skips the form validation, so bring it to the limits every other write
 * path enforces: trim, cut over-long text, drop cards with an empty side. Returns null
 * when no usable card is left.
 */
export function normalizeAiFlashcardOutput(output: AiFlashcardOutput): AiFlashcardOutput | null {
  const cards = output.cards
    .map((card) => {
      const example = card.example ? clip(card.example, CARD_EXAMPLE_MAX) : '';
      return {
        front: clip(card.front, CARD_FRONT_MAX),
        back: clip(card.back, CARD_BACK_MAX),
        ...(example ? { example } : {}),
      };
    })
    .filter((card) => card.front && card.back);
  if (cards.length === 0) return null;

  return {
    title: clip(output.title, SET_TITLE_MAX) || 'AI flashcards',
    description: clip(output.description, SET_DESCRIPTION_MAX),
    cards,
  };
}

export type AiGenerateInput = z.infer<typeof aiGenerateInputSchema>;
export type AiFlashcardOutput = z.infer<typeof aiFlashcardOutputSchema>;
