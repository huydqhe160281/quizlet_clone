import { z } from 'zod';

export const visibilitySchema = z.enum(['PRIVATE', 'PUBLIC']);

export const createSetSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  language: z.string().trim().max(10).optional(),
  visibility: visibilitySchema.default('PRIVATE'),
  tagIds: z.array(z.string().cuid()).max(20).optional(),
});

export const updateSetSchema = createSetSchema.partial();

export const listSetsQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  visibility: visibilitySchema.optional(),
  language: z.string().optional(),
  folderId: z.string().cuid().optional(),
});

/** Cap child sets per split to avoid abuse (chunkSize=1 on huge sets). */
export const MAX_SPLIT_PARTS = 100;

export const splitSetSchema = z.object({
  chunkSize: z.number().int().positive(),
});

export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type ListSetsQuery = z.infer<typeof listSetsQuerySchema>;
export type SplitSetInput = z.infer<typeof splitSetSchema>;
