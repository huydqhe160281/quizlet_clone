import { streamText, type ModelMessage, type LanguageModel } from 'ai';
import { buildSystemPrompt } from '@/features/guide/lib/assistant.prompt';
import { loadGuideConfig } from '@/features/guide/lib/load-guide-config';
import type { GuideUserContext } from '@/features/guide/schemas/guide-config.schema';
import { getOllamaChatModel } from '@/server/ai/ollama';
import { getZaiChatModel } from '@/server/ai/zai';

export type AssistantChatInput = {
  messages: ModelMessage[];
  userContext?: GuideUserContext;
  pathname?: string;
  signal?: AbortSignal;
};

/**
 * Ordered list of chat models to try. First available one wins.
 * For streaming, we pick the model BEFORE starting the stream and
 * fall back by catching errors from the stream's internal promise.
 */
function buildChatModelList(): Array<[label: string, model: LanguageModel | undefined]> {
  return [
    ['ollama', getOllamaChatModel()],
    ['zai', getZaiChatModel()],
  ];
}

export async function streamAssistantChat(input: AssistantChatInput) {
  const config = loadGuideConfig();
  const { getRequestLocale } = await import('@/lib/i18n/getRequestLocale');
  const locale = await getRequestLocale();
  const system = buildSystemPrompt(config, {
    userContext: input.userContext,
    pathname: input.pathname,
    locale,
  });

  const models = buildChatModelList();
  let lastError: unknown;

  for (const [label, model] of models) {
    if (!model) {
      console.log(`[chat fallback] skipping "${label}" — no model configured`);
      continue;
    }

    const stream = streamText({
      model,
      temperature: 0,
      system,
      messages: input.messages,
      abortSignal: input.signal,
    });

    try {
      // Await the first token/usage promise to detect immediate failures
      // (e.g. 404 model-not-found, ECONNREFUSED) before handing the stream
      // to the route. `stream.usage` rejects early when the request fails.
      console.log(`[chat fallback] trying "${label}"`);
      await stream.usage;
      console.log(`[chat fallback] "${label}" responded ✓`);
      return stream;
    } catch (err) {
      lastError = err;
      console.warn(`[chat fallback] "${label}" failed:`, err instanceof Error ? err.message : err);
      // Continue to next provider
    }
  }

  throw lastError ?? new Error('No chat AI provider available');
}

export function toCoreMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
