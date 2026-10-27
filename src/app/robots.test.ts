import { afterEach, describe, expect, it, vi } from 'vitest';

const loadRobots = async () => {
  vi.resetModules();
  return (await import('./robots')).default();
};

describe('robots.txt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows crawling and points the sitemap at the production domain', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'secret');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'quizfree.example');

    const robots = await loadRobots();

    expect(robots.sitemap).toBe('https://quizfree.example/sitemap.xml');
    expect(robots.rules).toMatchObject({ userAgent: '*', allow: '/' });
    expect(JSON.stringify(robots.rules)).toContain('/login');
  });

  it('blocks every crawler on preview deployments', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'secret');
    vi.stubEnv('VERCEL_ENV', 'preview');

    const robots = await loadRobots();

    expect(robots.rules).toEqual({ userAgent: '*', disallow: '/' });
    expect(robots.sitemap).toBeUndefined();
  });
});
