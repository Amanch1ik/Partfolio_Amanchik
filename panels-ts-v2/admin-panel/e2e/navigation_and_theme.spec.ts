import { test, expect } from '@playwright/test';

test('admin panel navigation across pages', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  // Basic navigation checks
  await page.goto('http://localhost:3001/promotions');
  await expect(page).toHaveURL(/promotions/);
  await page.goto('http://localhost:3001/transactions');
  await expect(page).toHaveURL(/transactions/);
  await page.goto('http://localhost:3001/settings');
  await expect(page).toHaveURL(/settings/);
});

test('admin panel dark theme toggle (if available)', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  const themeToggle = page.locator('[data-testid="theme-toggle"]');
  const hasToggle = await themeToggle.count();
  if (hasToggle > 0) {
    const colorBefore = await page.evaluate(() => getComputedStyle(document.body).color);
    await themeToggle.first().click();
    // small delay for theme transition
    await page.waitForTimeout(300);
    const colorAfter = await page.evaluate(() => getComputedStyle(document.body).color);
    // If toggle works, color should change
    expect(colorAfter).not.toBe(colorBefore);
  } else {
    test.skip('Theme toggle control not present on this build');
  }
});


