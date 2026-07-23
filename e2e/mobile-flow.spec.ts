import { test, expect } from '@playwright/test';

test.describe('mobile flow', () => {
  test('visits login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
  });
});
