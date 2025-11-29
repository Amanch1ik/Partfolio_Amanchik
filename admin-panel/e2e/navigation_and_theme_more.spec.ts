import { test, expect } from '@playwright/test';

test('admin panel navigation across additional pages', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  // Navigate to Analytics
  await page.goto('http://localhost:3001/analytics');
  await expect(page).toHaveURL(/analytics/);
  // Navigate to Referrals
  await page.goto('http://localhost:3001/referrals');
  await expect(page).toHaveURL(/referrals/);
  // Navigate to Partner Locations
  await page.goto('http://localhost:3001/partners/locations');
  await expect(page).toHaveURL(/partners/locations|partner-locations/);
  // Navigate to Stories
  await page.goto('http://localhost:3001/stories');
  await expect(page).toHaveURL(/stories/);
  // Navigate to Settings
  await page.goto('http://localhost:3001/settings');
  await expect(page).toHaveURL(/settings/);
});

test('admin panel theme toggle on additional pages (if available)', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  const themeToggle = page.locator('[data-testid="theme-toggle"]');
  const hasToggle = await themeToggle.count();
  if (hasToggle > 0) {
    const colorBefore = await page.evaluate(() => getComputedStyle(document.body).color);
    await themeToggle.first().click();
    await page.waitForTimeout(300);
    const colorAfter = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(colorAfter).not.toBe(colorBefore);
  } else {
    test.skip('Theme toggle control not present on this build');
  }
});


