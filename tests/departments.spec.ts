import { test, expect } from '@playwright/test';

// The departments line in THE COMPANY (docs/design/README.md, "The copy").
const NAMES = ['Software', 'Publishing', 'Games', 'Art', 'Events', 'Ventures'];

test.describe('home: the departments line', () => {
  test('the six names, in order, in the label face, and nothing else', async ({ page }) => {
    await page.goto('/');
    const strip = page.getByTestId('departments');
    await expect(page.locator('#company').getByTestId('departments')).toBeVisible();
    await expect(strip.getByTestId('department')).toHaveText(NAMES);
    const text = (await strip.textContent())!.replace(/\s+/g, ' ').trim();
    expect(text).toBe(`Departments ${NAMES.join(' · ')}`);
    await expect(strip.locator('a, img, svg')).toHaveCount(0);

    await expect(strip).toHaveCSS('font-family', /Big Shoulders Display/);
    await expect(strip).toHaveCSS('font-weight', '700');
    await expect(strip).toHaveCSS('text-transform', 'uppercase');
    await expect(strip).toHaveCSS('font-size', '15px');
    await expect(strip).toHaveCSS('letter-spacing', '1.8px'); // 0.12em at 15px
    await expect(strip).toHaveCSS('text-align', 'center');
    await expect(strip).toHaveCSS('color', 'rgb(28, 26, 22)');
    for (const side of ['top', 'bottom']) {
      await expect(strip).toHaveCSS(`border-${side}-width`, '2px');
      await expect(strip).toHaveCSS(`border-${side}-color`, 'rgb(28, 26, 22)');
    }
    await expect(strip.getByText('Departments')).toHaveCSS('color', 'rgb(31, 110, 122)');
    const dots = strip.locator('[aria-hidden="true"]');
    await expect(dots).toHaveCount(NAMES.length - 1);
    for (const color of await dots.evaluateAll((els) => els.map((el) => getComputedStyle(el).color))) {
      expect(color).toBe('rgb(197, 55, 44)');
    }
  });

  test('phone: two centred lines, no horizontal scroll at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const strip = page.getByTestId('departments');
    await strip.scrollIntoViewIfNeeded();
    const lines = await strip.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    console.log(`departments lines at 390px: ${lines}`);
    expect(lines).toBe(2);
    await expect(strip).toHaveCSS('text-align', 'center');
    const box = (await strip.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`scrollWidth at 390px: ${scroll}`);
    expect(scroll).toBeLessThanOrEqual(390);
  });
});
