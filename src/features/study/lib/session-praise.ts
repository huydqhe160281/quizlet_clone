/** Score bands for the encouragement line on the session-complete screen. */
export type PraiseTier = 'start' | 'quarter' | 'half' | 'great' | 'perfect';

/** Number of message variants per tier in the `study.praise.<tier><n>` catalog keys. */
export const PRAISE_VARIANTS = 3;

export function praiseTier(percent: number): PraiseTier {
  if (percent >= 100) return 'perfect';
  if (percent >= 75) return 'great';
  if (percent >= 50) return 'half';
  if (percent >= 25) return 'quarter';
  return 'start';
}

/** Catalog key for a tier; `seed` in [0, 1) picks one of the variants. */
export function praiseKey(percent: number, seed: number): string {
  const variant = Math.min(PRAISE_VARIANTS - 1, Math.floor(seed * PRAISE_VARIANTS)) + 1;
  return `study.praise.${praiseTier(percent)}${variant}`;
}
