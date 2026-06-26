import { z } from 'zod';
import { ASSISTANT_MAX_MESSAGE_CHARS } from '@/features/guide/constants';

const ASSISTANT_HISTORY_MAX_CHARS = 16_000;

const userChatMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string().min(1).max(ASSISTANT_MAX_MESSAGE_CHARS),
});

const assistantChatMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().min(1).max(ASSISTANT_HISTORY_MAX_CHARS),
});

const systemChatMessageSchema = z.object({
  role: z.literal('system'),
  content: z.string().min(1).max(ASSISTANT_HISTORY_MAX_CHARS),
});

export const assistantMessageSchema = z.discriminatedUnion('role', [
  userChatMessageSchema,
  assistantChatMessageSchema,
  systemChatMessageSchema,
]);

export const assistantChatRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1),
  pathname: z.string().optional(),
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
