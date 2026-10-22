const PROBE_ORIGIN = 'https://same-origin.invalid';

/**
 * True for a same-origin path such as `/sets/1?x=2`. Rejects protocol-relative and
 * backslash forms (`//evil.com`, `/\evil.com`, `/%5Cevil.com` after decoding by the
 * browser) that a `startsWith('/')` check lets through, plus control characters, which
 * browsers strip before resolving the URL.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith('/')) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return false;
  if (path.startsWith('//')) return false;
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/** The path itself when it is a safe same-origin path, otherwise `fallback`. */
export function safeInternalPath(path: string | null | undefined, fallback: string): string {
  return isSafeInternalPath(path) ? path : fallback;
}
