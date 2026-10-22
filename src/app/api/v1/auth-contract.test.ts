import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * Contract: every API handler that needs a user answers 401 to an anonymous request,
 * before touching the database. New routes are picked up automatically; a route that is
 * intentionally public (or optionally authenticated) must be listed in PUBLIC_HANDLERS.
 */

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

// Any DB access is a contract violation: auth must be checked first.
vi.mock('@/server/db', () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        throw new Error(`prisma.${String(prop)} accessed before auth`);
      },
    }
  ),
}));

vi.mock('@/lib/rate-limit/rate-limit-guard', () => ({
  assertApiRateLimit: vi.fn(async () => {}),
}));

vi.mock('@/lib/rate-limit/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const pass = { check: vi.fn(async () => ({ limited: false, retryAfterSec: 0 })) };
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      value && typeof value === 'object' && 'check' in value ? pass : value,
    ])
  );
});

vi.mock('@/lib/rate-limit/ai-rate-limit-guard', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(
    Object.keys(actual).map((key) => [
      key,
      typeof actual[key] === 'function' ? vi.fn(async () => null) : actual[key],
    ])
  );
});

vi.mock('@/lib/i18n/getRequestLocale', () => ({ getRequestLocale: vi.fn(async () => 'en') }));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const API_ROOT = path.resolve(__dirname);
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** `relative/route.ts METHOD` pairs that may answer anonymous requests. */
const PUBLIC_HANDLERS = new Set([
  'assistant/chat POST', // guests get their own rate limit
  'auth/forgot-password POST',
  'auth/register POST',
  'auth/reset-password POST',
  'auth/session-expired GET', // clears a revoked cookie, then redirects to /login
  'auth/verify-email POST',
  'library GET',
  'search GET', // optional user
  'sets/[setId] GET', // public sets are readable
  'sets/[setId]/cards GET',
  'tags GET',
]);

function findRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return findRoutes(full);
    return entry === 'route.ts' ? [full] : [];
  });
}

const routeFiles = findRoutes(API_ROOT);

function paramsFor(relative: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const match of relative.matchAll(/\[(\w+)\]/g)) {
    params[match[1]!] = 'clxxxxxxxxxxxxxxxxxxxxxxx';
  }
  return params;
}

describe('API auth contract', () => {
  it('discovers the route files', () => {
    expect(routeFiles.length).toBeGreaterThan(30);
  });

  for (const file of routeFiles) {
    const relative = path.relative(API_ROOT, path.dirname(file)).split(path.sep).join('/');

    it(`${relative}: protected handlers return 401 when signed out`, async () => {
      const mod = (await import(file)) as Partial<
        Record<(typeof METHODS)[number], (req: Request, ctx: unknown) => Promise<Response>>
      >;
      const handlers = METHODS.filter((method) => typeof mod[method] === 'function');
      expect(handlers.length).toBeGreaterThan(0);

      for (const method of handlers) {
        if (PUBLIC_HANDLERS.has(`${relative} ${method}`)) continue;

        const url = `http://localhost:3000/api/v1/${relative}?q=test`;
        const req = new Request(url, {
          method,
          headers: { 'content-type': 'application/json' },
          ...(method === 'GET' ? {} : { body: '{}' }),
        });
        const res = await mod[method]!(req, { params: Promise.resolve(paramsFor(relative)) });

        expect(res.status, `${method} /api/v1/${relative}`).toBe(401);
      }
    });
  }
});
