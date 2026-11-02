/** Score bands for the encouragement line on the round summary and session-complete screens. */
export type PraiseTier = 'perfect' | 'great' | 'good' | 'fair' | 'low';

/**
 * Which screen the line is for: `round` lines talk about the round just played
 * (`study.roundPraise.*`), `session` lines about the whole run (`study.praise.*`).
 */
export type PraiseScope = 'round' | 'session';

/** Number of message variants per tier in each scope's catalog keys (`<tier><n>`, 1-based). */
export const PRAISE_VARIANTS: Record<PraiseScope, number> = { round: 4, session: 3 };

const PRAISE_PREFIX: Record<PraiseScope, string> = {
  round: 'study.roundPraise',
  session: 'study.praise',
};

/** 10/10 → perfect, 8–9/10 → great, 6–7/10 → good, 4–5/10 → fair, 0–3/10 → low. */
export function praiseTier(percent: number): PraiseTier {
  if (percent >= 100) return 'perfect';
  if (percent >= 80) return 'great';
  if (percent >= 60) return 'good';
  if (percent >= 40) return 'fair';
  return 'low';
}

/** Share of correct answers in percent; 0 when nothing was answered. */
export function praisePercent(correct: number, answered: number): number {
  return answered > 0 ? (correct / answered) * 100 : 0;
}

/** Catalog key for a tier; `seed` in [0, 1) picks one of the scope's variants. */
export function praiseKey(percent: number, seed: number, scope: PraiseScope = 'session'): string {
  const count = PRAISE_VARIANTS[scope];
  const variant = Math.min(count - 1, Math.max(0, Math.floor(seed * count))) + 1;
  return `${PRAISE_PREFIX[scope]}.${praiseTier(percent)}${variant}`;
}
