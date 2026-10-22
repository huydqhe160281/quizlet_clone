import {
  streamText,
  type ModelMessage,
  type LanguageModel,
  type TextStreamPart,
  type ToolSet,
} from 'ai';
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

type StreamPart = TextStreamPart<ToolSet>;

export type AssistantChatStream = { toTextStreamResponse(): Response };

/**
 * Ordered list of chat models to try. First available one wins.
 * A provider counts as working once it produces its first text chunk; failures before
 * that (404 model-not-found, ECONNREFUSED) fall through to the next provider.
 */
function buildChatModelList(): Array<[label: string, model: LanguageModel | undefined]> {
  return [
    ['ollama', getOllamaChatModel()],
    ['zai', getZaiChatModel()],
  ];
}

async function readUntilFirstText(iterator: AsyncIterator<StreamPart>): Promise<string> {
  for (;;) {
    const { value, done } = await iterator.next();
    if (done) return '';
    if (value.type === 'error') throw value.error;
    if (value.type === 'text-delta' && value.text) return value.text;
  }
}

/** Plain-text body: the first chunk, then the remaining text deltas as they arrive. */
function textStreamResponse(first: string, iterator: AsyncIterator<StreamPart>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (first) controller.enqueue(encoder.encode(first));
    },
    // Each pull must enqueue, close or error: a pull that settles without doing any of
    // those is not called again, which would hang the reader on non-text parts.
    async pull(controller) {
      try {
        for (;;) {
          const { value, done } = await iterator.next();
          if (done) {
            controller.close();
            return;
          }
          if (value.type === 'error') {
            controller.error(value.error);
            return;
          }
          if (value.type === 'text-delta' && value.text) {
            controller.enqueue(encoder.encode(value.text));
            return;
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function streamAssistantChat(input: AssistantChatInput): Promise<AssistantChatStream> {
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
      console.log(`[chat fallback] trying "${label}"`);
      const iterator = stream.fullStream[Symbol.asyncIterator]();
      // Wait only for the first text chunk (not the whole answer) so the reply streams.
      const first = await readUntilFirstText(iterator);
      console.log(`[chat fallback] "${label}" responded ✓`);
      return { toTextStreamResponse: () => textStreamResponse(first, iterator) };
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
