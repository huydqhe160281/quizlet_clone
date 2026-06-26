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
    if (authRateLimit.check(`login:${ip}`)) {
      return Response.json(
        { error: 'RATE_LIMITED', message: 'Too many requests' },
        { status: 429 }
      );
    }
  }

  return handlers.POST(req);
}
