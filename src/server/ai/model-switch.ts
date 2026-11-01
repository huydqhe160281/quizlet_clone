/** Total calls per request, across all models. There are no retries of the same model. */
export const MAX_MODEL_ATTEMPTS = 3;

export type ModelSwitchOptions = {
  /** Abort one attempt after this long and switch model. Cleared once `fn` resolves. */
  attemptTimeoutMs?: number;
  /** Stop switching once this much time has passed (keep it under the route's maxDuration). */
  totalBudgetMs?: number;
  /** Caller cancellation (e.g. the client disconnected): stops without trying another model. */
  signal?: AbortSignal;
  /** Prefix for log lines. */
  label?: string;
};

/**
 * Calls `fn(modelId, signal)` with each model in order, once each, until one succeeds.
 * Any error (HTTP 401/429/5xx, timeout, empty or unparsable output — `fn` throws for the
 * last two) moves on to the next model. After {@link MAX_MODEL_ATTEMPTS} calls, or when
 * the list or the time budget runs out, the last error is thrown.
 *
 * The attempt timeout only covers `fn`'s promise: a streaming caller resolves on the first
 * chunk, and the rest of the stream is no longer bound by it.
 */
export async function withModelSwitch<T>(
  modelIds: string[],
  fn: (modelId: string, signal: AbortSignal) => Promise<T>,
  options: ModelSwitchOptions = {}
): Promise<T> {
  const {
    attemptTimeoutMs = Number.POSITIVE_INFINITY,
    totalBudgetMs = Number.POSITIVE_INFINITY,
    signal: callerSignal,
    label = 'AI',
  } = options;
  const deadline = Date.now() + totalBudgetMs;
  const candidates = modelIds.slice(0, MAX_MODEL_ATTEMPTS);
  let lastError: unknown = new Error('No AI model configured');

  for (const [index, modelId] of candidates.entries()) {
    callerSignal?.throwIfAborted();
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    const attempt = `${index + 1}/${candidates.length}`;
    const controller = new AbortController();
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    const timeoutMs = Math.min(attemptTimeoutMs, remainingMs);
    const timer = Number.isFinite(timeoutMs)
      ? setTimeout(
          () => controller.abort(new Error(`${modelId} timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      : undefined;
    const startedAt = Date.now();

    try {
      const result = await fn(modelId, controller.signal);
      console.log(`[${label}] ${modelId} ok in ${Date.now() - startedAt}ms (attempt ${attempt})`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(
        `[${label}] ${modelId} failed after ${Date.now() - startedAt}ms (attempt ${attempt}):`,
        error instanceof Error ? error.message : error
      );
      callerSignal?.throwIfAborted();
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  throw lastError;
}
