import { expect, test } from '@playwright/test';

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

test.describe('google oauth entry', () => {
  test.skip(!googleConfigured, 'Google OAuth credentials are not configured');

  test('starts Google sign-in flow from login page', async ({ page }) => {
    await page.goto('/login');

    const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    const popup = await popupPromise;
    if (popup) {
      await expect(popup).toHaveURL(/accounts\.google\.com|\/api\/auth\/signin\/google/);
      await popup.close();
      return;
    }

    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/);
  });

  test('starts Google sign-in flow from register page', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL(/\/api\/auth\/signin\/google|accounts\.google\.com/);
  });
});
