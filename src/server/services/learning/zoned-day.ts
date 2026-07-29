import { DEFAULT_PREFERRED_TIMEZONE } from '@/server/services/learning/constants';

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

/** Offset such that `utcMs + offset ≈ wall time as if UTC`. */
function getTimeZoneOffsetMs(utcInstant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(utcInstant);

  const map = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  ) as Record<string, string>;

  let hour = Number(map.hour);
  if (hour === 24) hour = 0;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - utcInstant.getTime();
}

/** Convert wall-clock time in `timeZone` to a UTC Date. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset1 = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const instant1 = utcGuess - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(instant1), timeZone);
  return new Date(utcGuess - offset2);
}

function addOneCalendarDay({ year, month, day }: Ymd): Ymd {
  const utc = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function startOfZonedDay(now: Date, timeZone: string): Date {
  const tz = resolveTimeZoneForMath(timeZone);
  const ymd = getZonedYmd(now, tz);
  return zonedWallTimeToUtc(ymd.year, ymd.month, ymd.day, 0, 0, 0, tz);
}

export function nextZonedDay(now: Date, timeZone: string): Date {
  const tz = resolveTimeZoneForMath(timeZone);
  const ymd = getZonedYmd(now, tz);
  const next = addOneCalendarDay(ymd);
  return zonedWallTimeToUtc(next.year, next.month, next.day, 0, 0, 0, tz);
}

/** Half-open window for trailing N zoned calendar days ending at nextZonedDay. */
export function zonedLookbackWindow(
  now: Date,
  timeZone: string,
  days: number
): { since: Date; until: Date } {
  const until = nextZonedDay(now, timeZone);
  const start = startOfZonedDay(now, timeZone);
  // Walk back (days - 1) calendar days from today's start.
  let cursor = start;
  for (let i = 0; i < days - 1; i += 1) {
    const prevInstant = new Date(cursor.getTime() - 12 * 60 * 60 * 1000);
    cursor = startOfZonedDay(prevInstant, timeZone);
  }
  return { since: cursor, until };
}
