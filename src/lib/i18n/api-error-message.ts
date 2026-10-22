type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * User-facing text for a failed API call. Server `message` strings are English developer
 * text, so the error `code` is mapped to `apiErrors.<CODE>`; unknown codes fall back to the
 * caller's own message. A message the server already localized (`localized: true` routes
 * such as forgot-password or the assistant) can be passed through with `trustMessage`.
 */
export function apiErrorMessage(
  t: Translate,
  payload: { error?: unknown; message?: unknown } | null | undefined,
  fallbackKey: string,
  options: { trustMessage?: boolean } = {}
): string {
  const code = typeof payload?.error === 'string' ? payload.error : undefined;
  if (code) {
    const key = `apiErrors.${code}`;
    const text = t(key);
    if (text !== key) return text;
  }
  if (options.trustMessage && typeof payload?.message === 'string' && payload.message) {
    return payload.message;
  }
  return t(fallbackKey);
}

/** Reads an error body without throwing on empty or non-JSON responses. */
export async function readErrorPayload(
  response: Response
): Promise<{ error?: string; message?: string } | null> {
  try {
    return (await response.json()) as { error?: string; message?: string };
  } catch {
    return null;
  }
}
