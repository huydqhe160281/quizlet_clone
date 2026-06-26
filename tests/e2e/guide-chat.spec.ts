import { expect, test } from '@playwright/test';

test.describe('guide chat widget', () => {
  test('FAB visible on landing and login pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Mở trợ lý hướng dẫn')).toBeVisible();

    await page.goto('/login');
    await expect(page.getByLabel('Mở trợ lý hướng dẫn')).toBeVisible();
  });

  test('dismiss hides widget until refresh', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Ẩn trợ lý hướng dẫn').click();
    await expect(page.getByLabel('Mở trợ lý hướng dẫn')).not.toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Mở trợ lý hướng dẫn')).toBeVisible();
  });

  test('panel close keeps FAB visible', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Mở trợ lý hướng dẫn').click();
    await page.getByLabel('Đóng trợ lý').click();
    await expect(page.getByLabel('Mở trợ lý hướng dẫn')).toBeVisible();
  });
});
