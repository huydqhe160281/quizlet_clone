import { expect, test } from '@playwright/test';

test.describe('route guard', () => {
  test('redirects unauthenticated users to login with callbackUrl', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
  });
});
