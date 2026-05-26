import { expect, test } from '@playwright/test';

test('redirects anonymous users to login from a protected route', async ({ page }) => {
  await page.goto('/fleet');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /aviation management/i })).toBeVisible();
});