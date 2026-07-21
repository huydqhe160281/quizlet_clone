import { withErrorHandler, ApiError } from '@/lib/api-error';
import { assistantGuestRateLimit, getClientIp } from '@/lib/rate-limit/rate-limit';
import { getRequestLocale } from '@/lib/i18n/getRequestLocale';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';
import {
  assistantChatRequestSchema,
  isUserMessageTooLongError,
} from '@/features/guide/schemas/assistant-chat.schema';
import { auth } from '@/server/auth/auth';
import { streamAssistantChat, toCoreMessages } from '@/server/services/ai/assistant.service';
import { getGuideUserContext } from '@/server/services/user/user-context.service';

export const maxDuration = 60;

export const POST = withErrorHandler(async (req) => {
  const session = await auth();
  const isGuest = !session?.user?.id;
  const locale = await getRequestLocale();
  const catalog = loadCatalog(locale);

  if (isGuest) {
    const ip = getClientIp(req);
    const decision = await assistantGuestRateLimit.check(ip);
    if (decision.limited) {
      throw new ApiError('RATE_LIMITED', 'Too many requests', 429, {
        retryAfter: decision.retryAfterSec,
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const parsed = assistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    if (isUserMessageTooLongError(body, parsed.error)) {
      throw new ApiError('MESSAGE_TOO_LONG', t(catalog, 'guideUi.messageTooLong'), 400);
    }
    throw new ApiError(
      'VALIDATION_ERROR',
      t(catalog, 'errors.validation'),
      400,
      parsed.error.flatten()
    );
  }

  const userContext = session?.user?.id ? await getGuideUserContext(session.user.id) : undefined;

  try {
    const result = await streamAssistantChat({
      messages: toCoreMessages(parsed.data.messages),
      userContext,
      pathname: parsed.data.pathname,
      signal: req.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[assistant/chat] stream_failed', {
      code: 'ASSISTANT_UNAVAILABLE',
      locale,
      isGuest,
      pathname: parsed.data.pathname ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError('ASSISTANT_UNAVAILABLE', t(catalog, 'guideUi.assistantUnavailable'), 503);
  }
});
