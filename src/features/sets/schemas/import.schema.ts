import { z } from 'zod';
import {
  CARD_BACK_MAX,
  CARD_EXAMPLE_MAX,
  CARD_FRONT_MAX,
} from '@/features/sets/cards/schemas/card.schema';
import {
  SET_DESCRIPTION_MAX,
  SET_LANGUAGE_MAX,
  SET_TITLE_MAX,
} from '@/features/sets/schemas/set.schema';

// ── Shared card schema ────────────────────────────────────────────────────────
export const importCardSchema = z.object({
  front: z.string().trim().min(1, 'Card front is required').max(CARD_FRONT_MAX),
  back: z.string().trim().min(1, 'Card back is required').max(CARD_BACK_MAX),
  example: z.string().trim().max(CARD_EXAMPLE_MAX).optional(),
});

// ── JSON import body ──────────────────────────────────────────────────────────
const CARD_LIMIT = 2000;

export const importJsonSchema = z.object({
  format: z.literal('json'),
  set: z.object({
    title: z.string().trim().min(1, 'Title is required').max(SET_TITLE_MAX),
    description: z.string().trim().max(SET_DESCRIPTION_MAX).optional(),
    language: z.string().trim().max(SET_LANGUAGE_MAX).optional(),
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
  title: z.string().trim().min(1, 'Title is required').max(SET_TITLE_MAX),
  description: z.string().trim().max(SET_DESCRIPTION_MAX).optional(),
  language: z.string().trim().max(SET_LANGUAGE_MAX).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional().default('PRIVATE'),
});

export type ImportCsvMeta = z.infer<typeof importCsvMetaSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
export const IMPORT_CARD_LIMIT = CARD_LIMIT;
export const IMPORT_FILE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024; // 2MB
