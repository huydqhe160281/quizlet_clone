import { z } from 'zod';
import {
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_MESSAGE_CHARS,
  ASSISTANT_MAX_PATHNAME_CHARS,
} from '@/features/guide/constants';

const ASSISTANT_HISTORY_MAX_CHARS = 16_000;

const userChatMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string().min(1).max(ASSISTANT_MAX_MESSAGE_CHARS),
});

const assistantChatMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().min(1).max(ASSISTANT_HISTORY_MAX_CHARS),
});

// No client "system" role: the server owns the system prompt, and accepting it
// would let any caller override the guide's instructions.
export const assistantMessageSchema = z.discriminatedUnion('role', [
  userChatMessageSchema,
  assistantChatMessageSchema,
]);

export const assistantChatRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(ASSISTANT_MAX_HISTORY_MESSAGES),
  // Interpolated into the system prompt: keep it a short app path.
  pathname: z
    .string()
    .max(ASSISTANT_MAX_PATHNAME_CHARS)
    .regex(/^\/[\w\-./[\]]*$/)
    .optional(),
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;

export function isUserMessageTooLongError(body: unknown, error: z.ZodError): boolean {
  return error.issues.some((issue) => {
    if (issue.code !== 'too_big' || issue.path[0] !== 'messages') {
      return false;
    }
    const index = issue.path[1];
    if (typeof index !== 'number') {
      return false;
    }
    const messages = (body as { messages?: Array<{ role?: string }> }).messages;
    return messages?.[index]?.role === 'user';
  });
}
