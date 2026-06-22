import bcrypt from 'bcryptjs';

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
