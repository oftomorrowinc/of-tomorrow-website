import { test, expect } from '@playwright/test';

test('brand configuration displays correctly', async ({ page }) => {
  await page.goto('/brand-test');

  await expect(page).toHaveTitle('Brand Test - Of Tomorrow, Inc.');

  // The nameplate face and the reading face
  await expect(page.locator('h1')).toHaveCSS('font-family', /Big Shoulders Display/);
  await expect(page.locator('body')).toHaveCSS('font-family', /Source Serif 4/);

  // Poppy is the primary action; the ground is paper
  await expect(page.locator('button:has-text("Primary Action")')).toHaveCSS('background-color', 'rgb(197, 55, 44)'); // #C5372C
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 236, 217)'); // #F4ECD9
});
