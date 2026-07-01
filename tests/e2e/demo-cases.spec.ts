import { test, expect } from '@playwright/test';

/**
 * Demo deep-links must load a pre-built investigation graph without requiring user setup.
 * These are the shareable URLs for HN/Reddit/Twitter launch announcements.
 */
test.describe('Demo deep-links', () => {
  test('breach demo loads and seeds the graph', async ({ page }) => {
    await page.goto('/case/demo/breach');

    // Should land in the Abster chat shell (not the landing login wall)
    await expect(page).toHaveURL(/\/case\/demo\/breach/);

    // Wait for the case title to appear in the UI
    await expect(page.getByText(/Email Breach Investigation/i).first()).toBeVisible({ timeout: 15000 });

    // The graph canvas should be mounted (D3 renders into a <canvas> or svg).
    // Either is acceptable; we just assert one is present.
    const graphCanvas = page.locator('canvas, svg').first();
    await expect(graphCanvas).toBeVisible({ timeout: 10000 });
  });

  test('domain demo loads and shows acme-corp.com', async ({ page }) => {
    await page.goto('/case/demo/domain');
    await expect(page).toHaveURL(/\/case\/demo\/domain/);
    await expect(page.getByText(/acme-corp\.com/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('person demo loads and shows the public figure', async ({ page }) => {
    await page.goto('/case/demo/person');
    await expect(page).toHaveURL(/\/case\/demo\/person/);
    await expect(page.getByText(/Jane Doe/i).first()).toBeVisible({ timeout: 15000 });
  });
});
