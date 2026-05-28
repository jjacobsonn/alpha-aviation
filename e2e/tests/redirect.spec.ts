import { expect, test } from '@playwright/test';

test('redirects anonymous users to login from a protected route', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
  await page.goto(`${base}/fleet`);

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /(?:aviation management|alpha aviation)/i })).toBeVisible();
});