import { expect, test } from '@playwright/test';
import { registerAndLogin } from '../helpers/auth';

test.describe('create set → study → dashboard', () => {
  test('creates a set via UI, studies flashcards, and shows stats on dashboard', async ({
    page,
    request,
  }) => {
    await registerAndLogin(page, request);

    await page.goto('/sets/new');
    await page.getByLabel('Title').fill('Dashboard Flow Set');
    await page.getByRole('button', { name: 'Create set' }).click();
    await expect(page).toHaveURL(/\/sets\/[^/]+$/);

    await page.getByLabel('Front').fill('hello');
    await page.getByLabel('Back').fill('xin chào');
    await page.getByRole('button', { name: 'Add card' }).click();
    await expect(page.getByText('hello')).toBeVisible();

    await page.getByRole('link', { name: /Study settings/i }).click();
    await expect(page).toHaveURL(/\/sets\/[^/]+\/study$/);

    await page.getByRole('button', { name: 'Start studying' }).click();
    await expect(page).toHaveURL(/\/flashcard\?sessionId=/, { timeout: 15_000 });
    await expect(page.getByText('Space to flip')).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Total sets')).toBeVisible();
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  });
});
