import { extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { env } from '@/config/env';

const LARGE_MODEL_FALLBACKS: Record<string, string> = {
  'gemma4:31b': 'gpt-oss:120b',
  'gpt-oss:20b': 'gpt-oss:120b',
};

function buildOllamaClient() {
  const headers = env.ollamaApiKey ? { Authorization: `Bearer ${env.ollamaApiKey}` } : undefined;
  return createOllama({
    baseURL: env.ollamaBaseUrl,
    ...(headers ? { headers } : {}),
  });
}

/**
 * Returns the primary Ollama model.
 * For the fallback cascade this always returns env.ollamaModel regardless of
 * card count — the large-model tier is handled by getOllamaLargeModel.
 */
export function getOllamaModel(_cardCount?: number): LanguageModel {
  const ollama = buildOllamaClient();
  // Cloud models often wrap JSON in markdown fences; middleware strips them before parsing.
  return wrapLanguageModel({
    model: ollama(env.ollamaModel),
    middleware: extractJsonMiddleware(),
  });
}

/**
 * Returns the "large" Ollama model for high-card-count requests, or undefined
 * when no separate large model is configured / the large model is the same as
 * the primary (to avoid a redundant retry tier).
 */
export function getOllamaLargeModel(_cardCount?: number): LanguageModel | undefined {
  const largeModelName = env.ollamaLargeModel ?? LARGE_MODEL_FALLBACKS[env.ollamaModel];

  // Skip if there is no distinct large model
  if (!largeModelName || largeModelName === env.ollamaModel) {
    return undefined;
  }

  const ollama = buildOllamaClient();
  return wrapLanguageModel({
    model: ollama(largeModelName),
    middleware: extractJsonMiddleware(),
  });
}

export function getOllamaChatModel(): LanguageModel {
  const ollama = buildOllamaClient();
  return ollama(env.ollamaModel);
}

export function getOllamaGenerateOptions(cardCount?: number) {
  const targetCards = cardCount ?? 120;

  return {
    temperature: 0,
    providerOptions: {
      ollama: {
        options: {
          num_predict: Math.min(targetCards * 200 + 500, 8192),
        },
      },
    },
  } as const;
}
