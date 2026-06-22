import { z } from 'zod';

// ── Shared card schema ────────────────────────────────────────────────────────
export const importCardSchema = z.object({
  front: z.string().min(1, 'Card front is required').max(2000),
  back: z.string().min(1, 'Card back is required').max(2000),
  example: z.string().max(2000).optional(),
});

// ── JSON import body ──────────────────────────────────────────────────────────
const CARD_LIMIT = 500;

export const importJsonSchema = z.object({
  format: z.literal('json'),
  set: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(2000).optional(),
    language: z.string().max(50).optional(),
    visibility: z.enum(['PRIVATE', 'PUBLIC']).optional().default('PRIVATE'),
  }),
  cards: z
    .array(importCardSchema)
    .min(1, 'At least one card is required')
    .max(CARD_LIMIT, `Maximum ${CARD_LIMIT} cards per import`),
});

export type ImportJsonInput = z.infer<typeof importJsonSchema>;

// ── CSV multipart form fields ─────────────────────────────────────────────────
export const importCsvMetaSchema = z.object({
  format: z.literal('csv'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  language: z.string().max(50).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional().default('PRIVATE'),
});

export type ImportCsvMeta = z.infer<typeof importCsvMetaSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
export const IMPORT_CARD_LIMIT = CARD_LIMIT;
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024; // 2MB
