import { z } from 'zod';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { assertSameOrigin } from '@/lib/i18n/origin';
import { assertApiRateLimit } from '@/lib/rate-limit/rate-limit-guard';
import { requireUserId } from '@/server/auth/auth-utils';
import {
  deletePushSubscription,
  getVapidPublicKey,
  isAllowedPushEndpoint,
  savePushSubscription,
} from '@/server/services/notifications/push.service';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const endpointSchema = z.string().max(2048).refine(isAllowedPushEndpoint);
const subscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});
const unsubscribeSchema = z.object({ endpoint: endpointSchema });

async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid push subscription', 400);
  }
  return parsed.data;
}

/** VAPID public key for `pushManager.subscribe`; null when push is not configured. */
export const GET = withErrorHandler(async () => {
  await requireUserId();
  return Response.json({ data: { publicKey: getVapidPublicKey() } }, { headers: NO_STORE });
});

export const POST = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  await assertApiRateLimit(request);
  if (!getVapidPublicKey()) {
    throw new ApiError('SERVICE_UNAVAILABLE', 'Push notifications are not configured', 503);
  }
  await savePushSubscription(userId, await parseBody(request, subscribeSchema));
  return Response.json({ data: { subscribed: true } }, { headers: NO_STORE });
});

export const DELETE = withErrorHandler(async (request) => {
  assertSameOrigin(request);
  const userId = await requireUserId();
  await assertApiRateLimit(request);
  const { endpoint } = await parseBody(request, unsubscribeSchema);
  await deletePushSubscription(userId, endpoint);
  return Response.json({ data: { subscribed: false } }, { headers: NO_STORE });
});
