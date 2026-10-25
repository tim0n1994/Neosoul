import { expect, test } from '@playwright/test';

test('public health and authentication boundary', async ({ page, request }) => {
  const health = await request.get('/api/health?deep=1');
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe('ok');

  const login = await page.goto('/login');
  expect(login?.ok()).toBeTruthy();
  await expect(page.locator('body')).not.toContainText('Application error');

  await page.goto('/rooms');
  await expect(page).toHaveURL(/\/login/);
});
