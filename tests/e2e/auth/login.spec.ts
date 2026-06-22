import { expect, test } from '@playwright/test';

const uniqueEmail = () => `e2e-${Date.now()}@example.com`;

test.describe('auth login', () => {
  test('registers and signs in with email/password', async ({ page, request }) => {
    const email = uniqueEmail();
    const password = 'E2ePass123!';

    const registerResponse = await request.post('/api/v1/auth/register', {
      data: { email, password, name: 'E2E User' },
    });
    expect(registerResponse.status()).toBe(201);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('missing@example.com');
    await page.getByLabel('Password').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
