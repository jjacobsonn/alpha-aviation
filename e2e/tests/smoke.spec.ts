import { expect, test } from '@playwright/test';

test('loads a protected page and logs out', async ({ page }) => {
  await page.goto('/fleet');

  await expect(page.getByRole('heading', { name: /^fleet$/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /tail #/i })).toBeVisible();
  await expect(page.getByText('1400')).toBeVisible();

  await page.getByRole('button', { name: /account/i }).click();
  await page.getByRole('menuitem', { name: /logout/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /aviation management/i })).toBeVisible();
});