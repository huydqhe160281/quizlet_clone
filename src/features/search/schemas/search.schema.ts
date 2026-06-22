import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  language: z.string().optional(),
  tagId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const libraryQuerySchema = z.object({
  sort: z.enum(['trending', 'most_studied', 'newest']).default('newest'),
  language: z.string().optional(),
  tagId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
