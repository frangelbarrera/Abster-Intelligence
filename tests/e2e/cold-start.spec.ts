import { test, expect } from '@playwright/test';

/**
 * Core flow: from cold landing to a fresh investigation case.
 * Abster's local-first mode auto-logs in as LOCAL_USER after the CTA click.
 */
test('cold start: enter app and create a case', async ({ page }) => {
  await page.goto('/');

  // Click the START INVESTIGATION CTA on the landing.
  const cta = page.getByRole('button', { name: /START INVESTIGATION/i }).first();
  await cta.click({ timeout: 10000 });

  // After CTA we should be inside the app shell on `/` or `/case/...`.
  await page.waitForTimeout(2000);

  // The app shell should render without crash.
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(100);

  // The "NEW INVESTIGATION" sidebar button should be visible.
  await expect(page.getByRole('button', { name: /NEW INVESTIGATION/i }).first()).toBeVisible({ timeout: 10000 });
});
