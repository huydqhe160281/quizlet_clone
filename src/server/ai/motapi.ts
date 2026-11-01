import { createOpenAI } from '@ai-sdk/openai';
import { extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';
import { env } from '@/config/env';

function buildMotapiClient() {
  return createOpenAI({
    name: 'motapi',
    baseURL: env.motapiBaseUrl,
    apiKey: env.motapiApiKey,
  });
}

/**
 * MotAPI model for structured JSON output. Several models wrap JSON in markdown fences;
 * the middleware strips them before parsing.
 */
export function getMotapiJsonModel(modelId: string): LanguageModel {
  return wrapLanguageModel({
    model: buildMotapiClient().chat(modelId),
    middleware: extractJsonMiddleware(),
  });
}

/** MotAPI model for plain streamed chat. */
export function getMotapiChatModel(modelId: string): LanguageModel {
  return buildMotapiClient().chat(modelId);
}
