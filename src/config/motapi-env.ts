export const MOTAPI_DEFAULT_BASE_URL = 'https://motapis.com/v1';

/**
 * Default model order per use case, picked from live tests on 2026-11-01 (only the first 3 are
 * ever called per request). Override with MOTAPI_SET_MODELS / MOTAPI_CHAT_MODELS
 * (comma-separated) without a code change.
 *
 * Set generation (JSON): deepseek-v4-flash was fastest and cheapest (40 cards in ~16s, ~4k
 * tokens) with clean JSON; kimi-k3.1-pro is clean but ~2x slower; claude-sonnet-5-5 is
 * reliable but bills ~12k tokens per call, so it is the last resort. gpt-6-sol took 71s for
 * 40 cards and overshot the count; grok-4.5 timed out.
 * Chat: kimi-k3.1-pro and deepseek-v4-flash answered in ~3.5s; kimi used ~250 tokens.
 *
 * Avoid: claude-sonnet-4-6 / grok-4.6 (broken), claude-sonnet-5 (~8k tokens per call),
 * hy3 / hy4-preview (return their reasoning text).
 */
export const DEFAULT_MOTAPI_SET_MODELS = [
  'deepseek-v4-flash',
  'kimi-k3.1-pro',
  'claude-sonnet-5-5',
  'minimax-m3',
];

export const DEFAULT_MOTAPI_CHAT_MODELS = [
  'kimi-k3.1-pro',
  'deepseek-v4-flash',
  'minimax-m3',
  'claude-sonnet-5-5',
];

export function resolveMotapiApiKey(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error('Missing required environment variable: MOTAPI_KEY');
  }
  return trimmed;
}

export function resolveMotapiBaseUrl(value?: string): string {
  return (value?.trim() || MOTAPI_DEFAULT_BASE_URL).replace(/\/$/, '');
}

/** Comma-separated model ids, de-duplicated; falls back to `defaults` when empty. */
export function parseModelList(value: string | undefined, defaults: string[]): string[] {
  const models = (value ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return models.length > 0 ? [...new Set(models)] : defaults;
}
