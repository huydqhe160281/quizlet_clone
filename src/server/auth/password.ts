import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const HASH_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, HASH_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A real bcrypt hash at the same cost, used when there is no account to check against.
// Built on first use so importing this module does not pay ~250 ms on cold start.
let timingDummyHash: Promise<string> | undefined;

/**
 * Spends the same bcrypt time as a real check, so a sign-in for an unknown (or
 * OAuth-only) email cannot be told apart from a wrong password by response time.
 */
export async function burnPasswordCheck(password: string): Promise<false> {
  timingDummyHash ??= bcrypt.hash('timing-equalizer', HASH_ROUNDS);
  await bcrypt.compare(password, await timingDummyHash);
  return false;
}

export function isResetTokenExpired(expires: Date, now = new Date()): boolean {
  return expires.getTime() <= now.getTime();
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
