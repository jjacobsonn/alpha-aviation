import { expect, test } from '@playwright/test';

test('logs in through the UI and lands on maintenance', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
  await page.goto(`${base}/login`);

  await expect(page.getByRole('heading', { name: /(?:aviation management|alpha aviation)/i })).toBeVisible();

  await page.getByLabel(/username/i).fill('e2e.mechanic');
  await page.getByRole('textbox', { name: /password/i }).fill('E2Epass123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/maintenance/);
  await expect(page.getByRole('heading', { name: /maintenance/i })).toBeVisible();
});