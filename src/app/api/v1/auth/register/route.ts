import { ApiError, withErrorHandler } from '@/lib/api-error';
import { authRateLimit, getClientIp } from '@/lib/rate-limit';
import { registerSchema } from '@/features/auth/schemas/auth.schema';
import { prisma } from '@/server/db';
import { hashPassword } from '@/server/password';

export const POST = withErrorHandler(async (req) => {
  const ip = getClientIp(req);
  if (authRateLimit.check(`register:${ip}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError('EMAIL_ALREADY_EXISTS', 'Email already registered', 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  return Response.json({ data: user }, { status: 201 });
});
