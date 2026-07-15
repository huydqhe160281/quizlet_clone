import type { LanguageModel } from 'ai';

/**
 * Attempts to call `fn(model)` up to `maxAttempts` times for each model in
 * the `models` array.  Models are tried in order; if all attempts for a model
 * are exhausted its error is swallowed and the next model is tried.
 *
 * Returns the first successful result, or throws the last error encountered
 * after all models have been exhausted.
 *
 * @param models   Ordered list of [label, model] pairs (undefined entries skipped).
 * @param fn       Async function that receives a model and returns a result.
 * @param maxAttempts  Number of attempts per model before moving to the next (default 2).
 */
export async function withModelFallback<T>(
  models: Array<[label: string, model: LanguageModel | undefined]>,
  fn: (model: LanguageModel) => Promise<T>,
  maxAttempts = 2
): Promise<T> {
  let lastError: unknown;

  const providers = models.map(([l, m]) => `${l}:${m ? 'ok' : 'skip'}`).join(' → ');
  console.log(`[AI fallback] cascade: ${providers}`);

  for (const [label, model] of models) {
    if (!model) {
      console.log(`[AI fallback] skipping "${label}" — no model configured`);
      continue;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[AI fallback] trying "${label}" attempt ${attempt}/${maxAttempts}`);
        const result = await fn(model);
        console.log(`[AI fallback] "${label}" succeeded ✓`);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(
          `[AI fallback] "${label}" attempt ${attempt}/${maxAttempts} failed:`,
          err instanceof Error ? err.message : err
        );
        if (attempt < maxAttempts) {
          await sleep(500 * attempt);
        }
      }
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
