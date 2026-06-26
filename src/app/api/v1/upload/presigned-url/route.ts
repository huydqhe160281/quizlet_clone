import { ApiError, withErrorHandler } from '@/lib/api-error';
import { uploadRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { presignedUrlSchema } from '@/features/upload/schemas/upload.schema';
import { requireUserId } from '@/server/auth/auth-utils';
import { generatePresignedUrl } from '@/server/services/upload.service';

export const POST = withErrorHandler(async (req) => {
  const ip = getClientIp(req);
  if (uploadRateLimit.check(`upload:${ip}`)) {
    throw new ApiError('RATE_LIMITED', 'Too many upload requests', 429);
  }

  const userId = await requireUserId();
  const body = await req.json();
  const input = presignedUrlSchema.parse(body);
  const result = await generatePresignedUrl(userId, input);
  return Response.json({ data: result });
});
