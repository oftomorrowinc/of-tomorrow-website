import { test, expect } from '@playwright/test';

test('brand configuration displays correctly', async ({ page }) => {
  await page.goto('/brand-test');
  
  // Check that the page loads
  await expect(page).toHaveTitle('Brand Test - Of Tomorrow, Inc.');
  
  // Check brand fonts are loaded
  await expect(page.locator('h1')).toHaveCSS('font-family', /Space Grotesk/);
  
  // Check brand colors are applied
  const primaryButton = page.locator('button:has-text("Primary Action")');
  await expect(primaryButton).toHaveCSS('background-color', 'rgb(0, 102, 255)'); // #0066FF
  
  const secondaryButton = page.locator('button:has-text("Secondary Action")');
  await expect(secondaryButton).toHaveCSS('background-color', 'rgb(255, 107, 53)'); // #FF6B35
});