import { Prisma } from '@prisma/client';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { hashPassword } from '@/server/auth/password';

const emailTaken = () => new ApiError('EMAIL_ALREADY_EXISTS', 'Email already registered', 400);

/** Creates a credentials account. `email` must already be lower-cased. */
export async function registerUser(input: { email: string; password: string; name?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw emailTaken();
  }

  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    // A concurrent sign-up with the same email passed the check above; the unique
    // index is the real guard.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw emailTaken();
    }
    throw error;
  }
}
