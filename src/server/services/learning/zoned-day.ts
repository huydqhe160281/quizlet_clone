/** Stored zone for users who have not set one; matches the `UserStats.preferredTimezone` default. */
export const DEFAULT_PREFERRED_TIMEZONE = 'UTC';

type Ymd = { year: number; month: number; day: number };

/**
 * Accept UTC / Etc/UTC, or any id that Intl can resolve as a timeZone.
 * Do not rely on supportedValuesOf membership alone.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') return true;
  try {
    // Throws RangeError for unknown zones.
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(timeZone: string): string {
  if (timeZone === 'Etc/UTC') return 'UTC';
  return timeZone;
}

/** For math: invalid/corrupt → UTC. */
export function resolveTimeZoneForMath(timeZone: string | null | undefined): string {
  const raw = (timeZone ?? '').trim() || DEFAULT_PREFERRED_TIMEZONE;
  if (!isValidTimeZone(raw)) return DEFAULT_PREFERRED_TIMEZONE;
  return normalizeTimeZone(raw);
}

function getZonedYmd(date: Date, timeZone: string): Ymd {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

/** Local calendar date in `timeZone`, encoded as UTC midnight of that date (a date-only key). */
export function zonedCalendarDay(date: Date, timeZone: string): Date {
  const { year, month, day } = getZonedYmd(date, resolveTimeZoneForMath(timeZone));
  return new Date(Date.UTC(year, month - 1, day));
}
