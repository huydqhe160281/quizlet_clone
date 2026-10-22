import { defineConfig, devices } from '@playwright/test';

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = process.env.PLAYWRIGHT_PORT ?? '3002';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Specs match English copy; the app picks the locale from Accept-Language (default vi).
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm start -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      // Every spec registers a fresh account from 127.0.0.1; auth limits (5/min) would 429.
      UNSAFE_DISABLE_RATE_LIMIT_FOR_E2E: '1',
      // Point E2E at a disposable database: specs create users and sets that are never
      // cleaned up. Without E2E_DATABASE_URL they write to the DATABASE_URL in .env.
      ...(process.env.E2E_DATABASE_URL
        ? {
            DATABASE_URL: process.env.E2E_DATABASE_URL,
            DIRECT_DATABASE_URL:
              process.env.E2E_DIRECT_DATABASE_URL ?? process.env.E2E_DATABASE_URL,
          }
        : {}),
    },
  },
});
