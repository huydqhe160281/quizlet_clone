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

export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type ListSetsQuery = z.infer<typeof listSetsQuerySchema>;
