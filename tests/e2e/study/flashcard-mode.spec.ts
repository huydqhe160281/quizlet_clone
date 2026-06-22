import { expect, test } from '@playwright/test';

const uniqueEmail = () => `study-${Date.now()}@example.com`;

test.describe('flashcard study mode', () => {
  test('flips card and navigates with keyboard', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'StudyPass123!';

    await page.request.post('/api/v1/auth/register', {
      data: { email, password, name: 'Study User' },
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Use in-page fetch so session cookies from login are included
    const setId = await page.evaluate(async () => {
      const res = await fetch('/api/v1/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: 'Study Set', visibility: 'PRIVATE' }),
      });
      if (!res.ok) {
        throw new Error(`create set failed: ${res.status} ${await res.text()}`);
      }
      const payload = (await res.json()) as { data: { id: string } };
      return payload.data.id;
    });

    for (const [front, back] of [
      ['hello', 'xin chào'],
      ['cat', 'con mèo'],
    ] as const) {
      const cardRes = await page.evaluate(
        async ({ setId: id, front: f, back: b }) => {
          const res = await fetch(`/api/v1/sets/${id}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ front: f, back: b }),
          });
          if (!res.ok) {
            throw new Error(`create card failed: ${res.status} ${await res.text()}`);
          }
          return res.ok;
        },
        { setId, front, back }
      );
      expect(cardRes).toBe(true);
    }

    await page.goto(`/sets/${setId}/flashcard`);
    await expect(page.getByText('Space to flip')).toBeVisible({ timeout: 10_000 });

    const firstFront = page.getByText(/^hello$|^cat$/);
    await expect(firstFront).toBeVisible();
    const firstLabel = (await firstFront.textContent()) ?? '';

    await page.keyboard.press('Space');
    await expect(page.getByText(firstLabel === 'hello' ? 'xin chào' : 'con mèo')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(firstLabel === 'hello' ? 'cat' : 'hello')).toBeVisible();
  });
});
