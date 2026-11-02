/** Score bands for the encouragement line on the round summary and session-complete screens. */
export type PraiseTier = 'perfect' | 'great' | 'good' | 'fair' | 'low';

/**
 * Which screen the line is for: `round` lines talk about the round just played,
 * `session` lines about the whole run.
 */
export type PraiseScope = 'round' | 'session';

/** Catalog prefix and number of variants per tier (`<prefix>.<tier><n>`, 1-based). */
export const PRAISE_CATALOG: Record<PraiseScope, { prefix: string; variants: number }> = {
  round: { prefix: 'study.roundPraise', variants: 4 },
  session: { prefix: 'study.praise', variants: 3 },
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

/**
 * Catalog key for a tier. `seed` in [0, 1) picks the starting variant and `step`
 * rotates from it, so consecutive rounds (step = round index) never repeat a line.
 */
export function praiseKey(
  percent: number,
  seed: number,
  scope: PraiseScope = 'session',
  step = 0
): string {
  const { prefix, variants } = PRAISE_CATALOG[scope];
  const start = Math.min(variants - 1, Math.max(0, Math.floor(seed * variants)));
  const variant = (((start + step) % variants) + variants) % variants;
  return `${prefix}.${praiseTier(percent)}${variant + 1}`;
}

let roundPraiseSeed: number | null = null;

/**
 * One random seed per page load for round lines: round summaries remount every
 * round, so a per-mount seed could repeat the previous round's line.
 */
export function getRoundPraiseSeed(): number {
  roundPraiseSeed ??= Math.random();
  return roundPraiseSeed;
}
