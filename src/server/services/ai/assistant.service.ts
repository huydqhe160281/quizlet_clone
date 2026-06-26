import { streamText, type ModelMessage } from 'ai';
import { buildSystemPrompt } from '@/features/guide/lib/assistant.prompt';
import { loadGuideConfig } from '@/features/guide/lib/load-guide-config';
import type { GuideUserContext } from '@/features/guide/schemas/guide-config.schema';
import { getOllamaChatModel } from '@/server/ai/ollama';

export type AssistantChatInput = {
  messages: ModelMessage[];
  userContext?: GuideUserContext;
  pathname?: string;
  signal?: AbortSignal;
};

export function streamAssistantChat(input: AssistantChatInput) {
  const config = loadGuideConfig();
  const system = buildSystemPrompt(config, {
    userContext: input.userContext,
    pathname: input.pathname,
  });

  return streamText({
    model: getOllamaChatModel(),
    temperature: 0,
    system,
    messages: input.messages,
    abortSignal: input.signal,
  });
}

export function toCoreMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
