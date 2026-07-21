import type { NextRequest } from 'next/server';
import { handlers } from '@/server/auth/auth';
import { authRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.includes('/callback/credentials')) {
    const ip = getClientIp(req);
    const decision = await authRateLimit.check(`login:${ip}`);
    if (decision.limited) {
      return Response.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { retryAfter: decision.retryAfterSec },
        },
        { status: 429 }
      );
    }
  }

  return handlers.POST(req);
}
