const DEV_OLLAMA_BASE_URL = 'http://localhost:11434/api';
const DEV_OLLAMA_MODEL = 'llama3';

export function resolveOllamaBaseUrl(nodeEnv: string, value?: string): string {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (nodeEnv !== 'production') {
    return DEV_OLLAMA_BASE_URL;
  }
  throw new Error('Missing required environment variable: OLLAMA_BASE_URL');
}

export function resolveOllamaModel(nodeEnv: string, value?: string): string {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (nodeEnv !== 'production') {
    return DEV_OLLAMA_MODEL;
  }
  throw new Error('Missing required environment variable: OLLAMA_MODEL');
}

export function resolveOllamaApiKey(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function resolveOllamaLargeModel(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
