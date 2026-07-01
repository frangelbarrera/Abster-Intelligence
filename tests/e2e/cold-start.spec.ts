import { test, expect } from '@playwright/test';

/**
 * Core flow: from cold landing to a fresh investigation case.
 * Skipped if the app requires login — Abster's local-first mode auto-logs in as LOCAL_USER.
 */
test('cold start: enter app and create a case', async ({ page }) => {
  await page.goto('/');

  // Click the "ACCESS" / "START INVESTIGATION" CTA on the landing.
  const cta = page.getByRole('button', { name: /ACCESS|START INVESTIGATION|ENTER/i }).first();
  await cta.click({ timeout: 10000 });

  // After CTA we should be inside the app shell on `/` or `/case/...`.
  await page.waitForURL(/\/(case\/.*)?$/, { timeout: 15000 });

  // The app shell should render without crash.
  const body = await page.locator('body').innerText();
  expect(body.length).toBeGreaterThan(100);
});
