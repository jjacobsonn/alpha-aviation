import { expect, test } from '@playwright/test';

test('loads a protected page and logs out', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
  await page.goto(`${base}/fleet`);

  await expect(page.getByRole('heading', { name: /^fleet$/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /tail #/i })).toBeVisible();
  await expect(page.getByText('1400')).toBeVisible();

  await page.getByRole('button', { name: /account/i }).click();
  await page.getByRole('button', { name: /logout/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /(?:aviation management|alpha aviation)/i })).toBeVisible();
});