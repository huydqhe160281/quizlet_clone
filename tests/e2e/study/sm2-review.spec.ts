import { expect, test } from '@playwright/test';
import { createSetWithCards, registerAndLogin } from '../helpers/auth';

test.describe('SM-2 spaced repetition review', () => {
  test('reviews due cards on /study with flashcard grading', async ({ page, request }) => {
    await registerAndLogin(page, request);

    await createSetWithCards(page, 'SM-2 Set', [
      { front: 'apple', back: 'táo' },
      { front: 'book', back: 'sách' },
    ]);

    await page.goto('/study');
    await expect(page.getByText(/due cards available today/i)).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Study style').click();
    await page.getByRole('option', { name: /Flashcards/i }).click();
    await page.getByRole('button', { name: 'Start session' }).click();

    await expect(page.getByText(/^apple$|^book$/)).toBeVisible();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText(/^apple$|^book$/)).toBeVisible();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('Round 1 Complete')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Next round/i }).click();
    await expect(page.getByText(/Session complete|Study complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
