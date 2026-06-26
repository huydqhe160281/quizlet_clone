import { extractJsonMiddleware, wrapLanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { env } from '@/config/env';

const LARGE_MODEL_FALLBACKS: Record<string, string> = {
  'gemma3:12b': 'gemma3:27b',
  'gpt-oss:20b': 'gpt-oss:120b',
};

function resolveModelForCardCount(cardCount?: number) {
  if (!cardCount || cardCount <= 50) {
    return env.ollamaModel;
  }

  if (env.ollamaLargeModel) {
    return env.ollamaLargeModel;
  }

  return LARGE_MODEL_FALLBACKS[env.ollamaModel] ?? env.ollamaModel;
}

export function getOllamaModel(cardCount?: number) {
  const headers = env.ollamaApiKey ? { Authorization: `Bearer ${env.ollamaApiKey}` } : undefined;

  const ollama = createOllama({
    baseURL: env.ollamaBaseUrl,
    ...(headers ? { headers } : {}),
  });

  // Cloud models often wrap JSON in markdown fences; middleware strips them before parsing.
  return wrapLanguageModel({
    model: ollama(resolveModelForCardCount(cardCount)),
    middleware: extractJsonMiddleware(),
  });
}

export function getOllamaChatModel() {
  const headers = env.ollamaApiKey ? { Authorization: `Bearer ${env.ollamaApiKey}` } : undefined;

  const ollama = createOllama({
    baseURL: env.ollamaBaseUrl,
    ...(headers ? { headers } : {}),
  });

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
