import { createOpenAI } from '@ai-sdk/openai';
import { extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';
import { env } from '@/config/env';

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';

/**
 * Returns a Z.ai language model for structured JSON generation tasks.
 * Returns undefined when ZAI_API_KEY is not configured so the caller can
 * skip this provider gracefully.
 */
export function getZaiModel(): LanguageModel | undefined {
  if (!env.zaiApiKey) {
    return undefined;
  }

  const zai = createOpenAI({
    baseURL: ZAI_BASE_URL,
    apiKey: env.zaiApiKey,
  });

  return wrapLanguageModel({
    model: zai.chat(env.zaiModel),
    middleware: extractJsonMiddleware(),
  });
}

/**
 * Returns a Z.ai language model for chat/stream tasks (no JSON middleware).
 * Returns undefined when ZAI_API_KEY is not configured.
 */
export function getZaiChatModel(): LanguageModel | undefined {
  if (!env.zaiApiKey) {
    return undefined;
  }

  const zai = createOpenAI({
    baseURL: ZAI_BASE_URL,
    apiKey: env.zaiApiKey,
  });

  return zai.chat(env.zaiModel);
}
