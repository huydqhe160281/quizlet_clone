import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const uniqueEmail = () => `e2e-${Date.now()}@example.com`;

export async function registerAndLogin(page: Page, request: APIRequestContext) {
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
  await expect(page).toHaveURL(/\/dashboard/);

  return { email, password };
}

export async function createSetWithCards(
  page: Page,
  title: string,
  cards: Array<{ front: string; back: string }>
) {
  const setId = await page.evaluate(
    async (payload) => {
      const res = await fetch('/api/v1/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: payload.title, visibility: 'PRIVATE' }),
      });
      if (!res.ok) {
        throw new Error(`create set failed: ${res.status} ${await res.text()}`);
      }
      const body = (await res.json()) as { data: { id: string } };
      return body.data.id;
    },
    { title }
  );

  for (const card of cards) {
    const ok = await page.evaluate(
      async ({ setId: id, front, back }) => {
        const res = await fetch(`/api/v1/sets/${id}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ front, back }),
        });
        return res.ok;
      },
      { setId, front: card.front, back: card.back }
    );
    expect(ok).toBe(true);
  }

  return setId;
}
