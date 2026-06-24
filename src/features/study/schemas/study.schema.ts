import { z } from 'zod';

export const studyModeSchema = z.enum(['FLASHCARD', 'LEARN', 'WRITE', 'TEST', 'DRAW']);

// ── Study session settings (round engine config) ──────────────────────────────
export const studySessionSettingsSchema = z.object({
  randomize: z.boolean().default(false),
  cardsPerRound: z.number().int().min(1).max(50).default(10),
  requeueWrong: z.boolean().default(true),
  /** MC-only presentation flag — LEARN mode only */
  presentation: z.enum(['default', 'multiple_choice']).default('multiple_choice'),
});

export type StudySessionSettings = z.infer<typeof studySessionSettingsSchema>;

export const STUDY_SESSION_SETTINGS_DEFAULTS: StudySessionSettings = {
  randomize: false,
  cardsPerRound: 10,
  requeueWrong: true,
  presentation: 'multiple_choice',
};

/** Fallback settings for legacy sessions (settings column is null) — mirrors V1 behaviour */
export const LEGACY_SESSION_SETTINGS_FALLBACK = {
  randomize: true,
  requeueWrong: false,
  // cardsPerRound is dynamic: totalCards
} as const;

export const createSessionSchema = z.object({
  setId: z.string().cuid(),
  mode: studyModeSchema,
  settings: studySessionSettingsSchema.optional(),
});

export const completeSessionSchema = z.object({
  correctCount: z.number().int().min(0),
  reviewedCount: z.number().int().min(0).optional(),
});

export const recordAnswerSchema = z.object({
  cardId: z.string().cuid(),
  isCorrect: z.boolean(),
});

export const reviewSchema = z.object({
  cardId: z.string().cuid(),
  grade: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']),
  responseMs: z.number().int().min(0).optional(),
});

export type StudyModeValue = z.infer<typeof studyModeSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
