import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import {
  DEFAULT_PREFERRED_TIMEZONE,
  isValidTimeZone,
  normalizeTimeZone,
} from '@/server/services/learning/zoned-day';
import { ensureUserStats } from '@/server/services/user/stats.service';

export function validatePreferredTimezone(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('VALIDATION_ERROR', 'preferredTimezone must be a non-empty string', 400);
  }
  const trimmed = value.trim();
  if (!isValidTimeZone(trimmed)) {
    throw new ApiError('VALIDATION_ERROR', 'preferredTimezone is not a valid IANA timezone', 400);
  }
  return normalizeTimeZone(trimmed);
}

/** Set the zone the user picked in Settings (streak days, reminder time). */
export async function setPreferredTimezone(userId: string, value: unknown) {
  const preferredTimezone = validatePreferredTimezone(value);
  await ensureUserStats(userId);
  await prisma.userStats.update({ where: { userId }, data: { preferredTimezone } });
  return { preferredTimezone };
}

/**
 * Adopt the browser-detected time zone only while the stored one is still the default,
 * so a zone the user already has is never overwritten. Returns the stored zone.
 */
export async function adoptDetectedTimezone(userId: string, detected: unknown) {
  const timeZone = validatePreferredTimezone(detected);
  await ensureUserStats(userId);
  await prisma.userStats.updateMany({
    where: { userId, preferredTimezone: DEFAULT_PREFERRED_TIMEZONE },
    data: { preferredTimezone: timeZone },
  });
  const stats = await prisma.userStats.findUnique({
    where: { userId },
    select: { preferredTimezone: true },
  });
  return { preferredTimezone: stats?.preferredTimezone ?? DEFAULT_PREFERRED_TIMEZONE };
}
