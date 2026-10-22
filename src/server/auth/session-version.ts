import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/server/db';

/**
 * Session revocation for JWT sessions. Each user row carries a `sessionVersion`; it is
 * copied into the token at sign-in and bumped on password reset. A token whose version
 * no longer matches the row (or whose user is gone) is rejected by the Node-side jwt
 * callback. Middleware runs the edge config without this check, so the client clears
 * the cookie (signOut) when /api/v1/auth/me comes back 401 — see useAccountStatus.
 */

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 1_000;

const versionCache = new Map<string, { version: number | null; expiresAt: number }>();

/** Current version for a user, or null when the user no longer exists. */
export async function getSessionVersion(userId: string): Promise<number | null> {
  const now = Date.now();
  const cached = versionCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.version;

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  const version = row?.sessionVersion ?? null;

  if (versionCache.size >= CACHE_MAX_ENTRIES) versionCache.clear();
  versionCache.set(userId, { version, expiresAt: now + CACHE_TTL_MS });
  return version;
}

/** Drop the cached version so this instance sees a bump immediately. */
export function forgetSessionVersion(userId: string): void {
  versionCache.delete(userId);
}

export function clearSessionVersionCache(): void {
  versionCache.clear();
}

type SignInUser = { id?: string | null; sessionVersion?: unknown };

/**
 * Stamps the version on sign-in and validates it on every later read.
 * Returns null to end the session. Tokens issued before this field existed count as 0.
 */
export async function applySessionVersion(
  token: JWT,
  user?: SignInUser | null
): Promise<JWT | null> {
  if (user?.id) {
    token.sv =
      typeof user.sessionVersion === 'number'
        ? user.sessionVersion
        : ((await getSessionVersion(user.id)) ?? 0);
    return token;
  }

  if (!token.sub) return token;

  let current: number | null;
  try {
    current = await getSessionVersion(token.sub);
  } catch (error) {
    // A transient DB failure must not sign everyone out; the API calls fail on their own.
    console.error('[auth] session version check failed', error);
    return token;
  }

  if (current === null || current !== (token.sv ?? 0)) return null;
  return token;
}
