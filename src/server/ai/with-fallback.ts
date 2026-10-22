import type { LanguageModel } from 'ai';

export type ModelFallbackOptions = {
  /** Attempts per model before moving to the next (default 2). */
  maxAttempts?: number;
  /** Abort a single attempt after this long, so one hung provider cannot eat the budget. */
  attemptTimeoutMs?: number;
  /** Stop the whole cascade after this long (keep it under the route's maxDuration). */
  totalBudgetMs?: number;
};

/**
 * Attempts to call `fn(model, signal)` up to `maxAttempts` times for each model in
 * the `models` array. Models are tried in order; if all attempts for a model
 * are exhausted its error is swallowed and the next model is tried.
 *
 * Each attempt gets an AbortSignal bounded by `attemptTimeoutMs` and by what is left
 * of `totalBudgetMs`. Errors the provider marks as non-retryable (`isRetryable: false`,
 * e.g. a wrong model name or bad API key) skip straight to the next model.
 *
 * Returns the first successful result, or throws the last error encountered
 * after all models have been exhausted or the budget runs out.
 *
 * @param models   Ordered list of [label, model] pairs (undefined entries skipped).
 * @param fn       Async function that receives a model and an abort signal.
 * @param options  Attempts per model (a number, for backward compatibility) or full options.
 */
export async function withModelFallback<T>(
  models: Array<[label: string, model: LanguageModel | undefined]>,
  fn: (model: LanguageModel, signal: AbortSignal) => Promise<T>,
  options: number | ModelFallbackOptions = 2
): Promise<T> {
  const {
    maxAttempts = 2,
    attemptTimeoutMs = Number.POSITIVE_INFINITY,
    totalBudgetMs = Number.POSITIVE_INFINITY,
  } = typeof options === 'number' ? { maxAttempts: options } : options;
  const deadline = Date.now() + totalBudgetMs;
  let lastError: unknown;

  const providers = models.map(([l, m]) => `${l}:${m ? 'ok' : 'skip'}`).join(' → ');
  console.log(`[AI fallback] cascade: ${providers}`);

  for (const [label, model] of models) {
    if (!model) {
      console.log(`[AI fallback] skipping "${label}" — no model configured`);
      continue;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw lastError ?? new Error('AI generation time budget exceeded');
      }

      try {
        console.log(`[AI fallback] trying "${label}" attempt ${attempt}/${maxAttempts}`);
        const result = await fn(model, timeoutSignal(Math.min(attemptTimeoutMs, remainingMs)));
        console.log(`[AI fallback] "${label}" succeeded ✓`);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(
          `[AI fallback] "${label}" attempt ${attempt}/${maxAttempts} failed:`,
          err instanceof Error ? err.message : err
        );
        if (isNonRetryable(err)) {
          break;
        }
        const backoffMs = 500 * attempt;
        if (attempt < maxAttempts && deadline - Date.now() > backoffMs) {
          await sleep(backoffMs);
        }
      }
    }
  }

  throw lastError;
}

function isNonRetryable(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isRetryable' in err &&
    (err as { isRetryable?: unknown }).isRetryable === false
  );
}

function timeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout rejects Infinity; a never-aborting signal covers "no limit".
  return Number.isFinite(ms) ? AbortSignal.timeout(Math.max(1, ms)) : new AbortController().signal;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
