import { streamText, type ModelMessage, type TextStreamPart, type ToolSet } from 'ai';
import { env } from '@/config/env';
import { buildSystemPrompt } from '@/features/guide/lib/assistant.prompt';
import { loadGuideConfig } from '@/features/guide/lib/load-guide-config';
import type { GuideUserContext } from '@/features/guide/schemas/guide-config.schema';
import { getMotapiChatModel } from '@/server/ai/motapi';
import { withModelSwitch, type ModelSwitchOptions } from '@/server/ai/model-switch';

export type AssistantChatInput = {
  messages: ModelMessage[];
  userContext?: GuideUserContext;
  pathname?: string;
  signal?: AbortSignal;
};

type StreamPart = TextStreamPart<ToolSet>;

export type AssistantChatStream = { toTextStreamResponse(): Response };

/** Time to first chunk per model (the real system prompt makes kimi take ~10s), and the overall
 * switching budget, leaving room to stream the answer within the route's 60s maxDuration. */
export const ASSISTANT_SWITCH_OPTIONS: ModelSwitchOptions = {
  label: 'assistant',
  attemptTimeoutMs: 20_000,
  totalBudgetMs: 45_000,
};

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

  // A model counts as working once it produces its first text chunk; an error, timeout or
  // empty answer before that switches to the next model (3 calls at most, no retries).
  return withModelSwitch(
    env.motapiChatModels,
    async (modelId, attemptSignal) => {
      const stream = streamText({
        model: getMotapiChatModel(modelId),
        temperature: 0,
        system,
        messages: input.messages,
        maxRetries: 0,
        // The attempt signal covers the wait for the first chunk (and caller aborts until
        // then); the caller signal keeps cancelling the stream after it.
        abortSignal: input.signal ? AbortSignal.any([attemptSignal, input.signal]) : attemptSignal,
      });
      const iterator = stream.fullStream[Symbol.asyncIterator]();
      // Wait only for the first text chunk (not the whole answer) so the reply streams.
      const first = await readUntilFirstText(iterator);
      if (!first) {
        throw new Error('Empty response');
      }
      return { toTextStreamResponse: () => textStreamResponse(first, iterator) };
    },
    { ...ASSISTANT_SWITCH_OPTIONS, signal: input.signal }
  );
}

export function toCoreMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
