import { test, expect } from '@playwright/test';

/**
 * Smoke test: landing page renders without fake-metric language.
 */
test('landing renders hero and demo terminal without fake metrics', async ({ page }) => {
  await page.goto('/');

  // Title should mention Abster
  await expect(page).toHaveTitle(/Abster/i);

  // Hero text present (the landing uses "ABSTER" as a wordmark)
  await expect(page.locator('body')).toContainText(/ABSTER/i);

  // Demo terminal should NOT contain the old fake metrics
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('1,247 intelligence points');
  expect(body).not.toContain('Credential leak detected');
  expect(body).not.toContain('TOP SECRET');
});
