import { withErrorHandler, ApiError } from '@/lib/api-error';
import { assistantGuestRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  assistantChatRequestSchema,
  isUserMessageTooLongError,
} from '@/features/guide/schemas/assistant-chat.schema';
import { auth } from '@/server/auth';
import { streamAssistantChat, toCoreMessages } from '@/server/services/assistant.service';
import { getGuideUserContext } from '@/server/services/user-context.service';

export const maxDuration = 60;

export const POST = withErrorHandler(async (req) => {
  const session = await auth();
  const isGuest = !session?.user?.id;

  if (isGuest) {
    const ip = getClientIp(req);
    if (assistantGuestRateLimit.check(ip)) {
      throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
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
      throw new ApiError('MESSAGE_TOO_LONG', 'Tin nhắn vượt quá giới hạn 500 ký tự', 400);
    }
    throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const userContext = session?.user?.id ? await getGuideUserContext(session.user.id) : undefined;

  try {
    const result = streamAssistantChat({
      messages: toCoreMessages(parsed.data.messages),
      userContext,
      pathname: parsed.data.pathname,
      signal: req.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[assistant/chat]', error);
    }
    throw new ApiError(
      'ASSISTANT_UNAVAILABLE',
      'Trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.',
      503
    );
  }
});
