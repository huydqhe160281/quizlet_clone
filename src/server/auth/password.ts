import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const HASH_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, HASH_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isResetTokenExpired(expires: Date, now = new Date()): boolean {
  return expires.getTime() <= now.getTime();
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
