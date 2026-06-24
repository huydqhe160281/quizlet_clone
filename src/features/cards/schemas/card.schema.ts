import { z } from 'zod';

const cardTypeSchema = z.enum(['new-word']).nullable();

const cardFields = {
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(500),
  example: z.string().trim().max(1000).optional(),
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
