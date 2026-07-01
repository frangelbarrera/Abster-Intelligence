import { test, expect } from '@playwright/test';

/**
 * Smoke test: landing page renders without fake-metric language.
 */
test('landing renders hero and demo terminal without fake metrics', async ({ page }) => {
  await page.goto('/');

  // Title should mention Abster Intelligence
  await expect(page).toHaveTitle(/Abster/i);

  // Hero text present
  await expect(page.getByText(/Abster Intelligence/i).first()).toBeVisible();

  // Demo terminal should NOT contain the old fake metrics
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('1,247 intelligence points');
  expect(body).not.toContain('Credential leak detected');
  expect(body).not.toContain('TOP SECRET');
});
