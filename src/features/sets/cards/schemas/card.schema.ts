import { z } from 'zod';

const cardTypeSchema = z.enum(['new-word']).nullable();

/**
 * One set of card text limits for the editor, import and AI generation. Import has
 * always allowed 2000 characters (long exam questions), so the editor matches it rather
 * than rejecting cards that already exist.
 */
export const CARD_FRONT_MAX = 2000;
export const CARD_BACK_MAX = 2000;
export const CARD_EXAMPLE_MAX = 2000;

const cardFields = {
  front: z.string().trim().min(1).max(CARD_FRONT_MAX),
  back: z.string().trim().min(1).max(CARD_BACK_MAX),
  example: z.string().trim().max(CARD_EXAMPLE_MAX).optional(),
  imageUrl: z.string().max(500).optional(),
  audioUrl: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
};

export const createCardSchema = z.object({
  ...cardFields,
  type: cardTypeSchema.optional().default(null),
});

export const updateCardSchema = z
  .object({
    ...cardFields,
    type: cardTypeSchema.optional(),
  })
  .partial();

export const reorderCardsSchema = z.object({
  cardIds: z.array(z.string().cuid()).min(1),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
