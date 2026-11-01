import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';
import { env } from '@/config/env';

let cached: { apiKey: string; baseURL: string; provider: OpenAIProvider } | undefined;

/**
 * Shared MotAPI provider, rebuilt only when the key or base URL changes. Throws when
 * MOTAPI_KEY is missing: call it before switching models, so a configuration error fails
 * once instead of looking like three model failures.
 */
export function getMotapiProvider(): OpenAIProvider {
  const apiKey = env.motapiApiKey;
  const baseURL = env.motapiBaseUrl;
  if (!cached || cached.apiKey !== apiKey || cached.baseURL !== baseURL) {
    cached = { apiKey, baseURL, provider: createOpenAI({ name: 'motapi', baseURL, apiKey }) };
  }
  return cached.provider;
}

/**
 * MotAPI model for structured JSON output. Several models wrap JSON in markdown fences;
 * the middleware strips them before parsing.
 */
export function getMotapiJsonModel(
  modelId: string,
  provider: OpenAIProvider = getMotapiProvider()
): LanguageModel {
  return wrapLanguageModel({
    model: provider.chat(modelId),
    middleware: extractJsonMiddleware(),
  });
}

/** MotAPI model for plain streamed chat. */
export function getMotapiChatModel(
  modelId: string,
  provider: OpenAIProvider = getMotapiProvider()
): LanguageModel {
  return provider.chat(modelId);
}
