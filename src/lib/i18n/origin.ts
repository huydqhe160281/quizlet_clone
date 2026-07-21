import { ApiError } from '@/lib/api-error';
import { env } from '@/config/env';

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const expected = env.authUrl.replace(/\/$/, '');
  if (origin.replace(/\/$/, '') !== expected) {
    throw new ApiError('FORBIDDEN', 'Origin mismatch', 403);
  }
}
