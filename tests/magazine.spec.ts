import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.describe('home: the magazine', () => {
  test('nameplate, issue line and nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nameplate')).toHaveText(/OF TOMORROW\s+INC\./i);
    await expect(page.getByTestId('nameplate')).toHaveCSS('font-family', /Big Shoulders Display/);
    await expect(page.getByTestId('issue-line')).toContainText('Building the world of tomorrow, in public');
    for (const label of ['Now building', 'From the workshop', 'The company', 'Write to us']) {
      await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('cover story: headline and the two buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText("A great big beautiful tomorrow doesn't arrive in your feed.");
    await expect(page.getByRole('link', { name: 'See BYOLLM →' })).toHaveAttribute('href', 'https://byo-llm.com');
    await expect(page.getByRole('link', { name: 'Early access to the cloud' })).toHaveAttribute(
      'href',
      'https://byollm.cloud/early-access',
    );
  });

  test('NOW BUILDING: the three links', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('building-card');
    await expect(cards).toHaveCount(3);
    const hrefs = await cards.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['https://byo-llm.com', 'https://byollm.cloud', 'https://translations.oftomorrow.net']);
    await expect(cards.nth(0)).toContainText('BYOLLM');
    await expect(cards.nth(1)).toContainText('BYOLLM Cloud');
    await expect(cards.nth(2)).toContainText('Translations Of Tomorrow');
  });

  test('FROM THE WORKSHOP: two cards with real titles from the feed', async ({ page, request }) => {
    const feed = await (await request.get('https://todd.oftomorrow.net/rss.xml')).text();
    const titles = [...feed.matchAll(/<item><title>([\s\S]*?)<\/title>/g)].map((m) => m[1]);
    console.log(`feed titles: ${JSON.stringify(titles.slice(0, 2))}`);
    await page.goto('/');
    const cards = page.getByTestId('workshop-card');
    await expect(cards).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(cards.nth(i).locator('h3')).toHaveText(titles[i]);
      await expect(cards.nth(i).locator('h3 a')).toHaveAttribute('href', /^https:\/\/todd\.oftomorrow\.net\//);
    }
    await expect(page.getByTestId('all-posts')).toHaveAttribute('href', 'https://todd.oftomorrow.net');
  });

  test('both illustrations, with captions', async ({ page }) => {
    await page.goto('/');
    for (const [id, src, caption] of [
      ['fig-1', '/images/art/cover-workbench.webp', /^\s*Fig\. 1 — \S/],
      ['fig-2', '/images/art/house-cutaway.webp', /^\s*Fig\. 2 — \S/],
    ] as const) {
      const fig = page.getByTestId(id);
      const img = fig.locator('img');
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('src', src);
      await expect(img).toHaveAttribute('width', /\d+/);
      await expect(img).toHaveAttribute('height', /\d+/);
      expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(fig.locator('figcaption')).toHaveText(caption);
    }
    await expect(page.getByTestId('fig-2').locator('img')).toHaveAttribute('loading', 'lazy');
  });

  test('phone: stacked header, 52px headline, full-width buttons, no horizontal scroll at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCSS('font-size', '52px');
    await expect(page.getByTestId('nameplate')).toHaveCSS('font-size', '48px');
    const btn = await page.getByRole('link', { name: 'See BYOLLM →' }).boundingBox();
    expect(btn!.width).toBeGreaterThanOrEqual(390 - 48 - 1);
    const card = await page.getByTestId('workshop-card').first().boundingBox();
    expect(card!.width).toBeGreaterThanOrEqual(390 - 48 - 1);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`scrollWidth at 390px: ${scroll}`);
    expect(scroll).toBeLessThanOrEqual(390);
  });
});

test.describe('blog: same chrome', () => {
  test('index and launch post', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByTestId('nameplate')).toBeVisible();
    await expect(page.getByRole('link', { name: 'todd.oftomorrow.net' }).first()).toHaveAttribute(
      'href',
      'https://todd.oftomorrow.net',
    );
    await page.goto('/blog/byollm-is-open-source/');
    await expect(page.locator('h1')).toHaveText('BYOLLM is open source');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://oftomorrow.net/blog/byollm-is-open-source/',
    );
    await expect(page.locator('article')).toHaveCSS('font-family', /Source Serif 4/);
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('build output and tokens', () => {
  test('no Space Grotesk or Inter in the built CSS', () => {
    const dir = join(process.cwd(), 'dist', '_astro');
    const css = readdirSync(dir).filter((f) => f.endsWith('.css'));
    expect(css.length).toBeGreaterThan(0);
    for (const f of css) {
      const text = readFileSync(join(dir, f), 'utf8');
      expect(text, f).not.toMatch(/Space Grotesk/);
      expect(text, f).not.toMatch(/(["',\s:])Inter(["',;])/);
      expect(text, f).toMatch(/Big Shoulders Display/);
    }
  });

  test('contrast: body-muted on paper and paper on teal are at least 4.5:1', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const pairs: [string, string, string][] = [
      ['body-muted on paper', '#4A4335', '#F4ECD9'],
      ['paper on teal', '#F4ECD9', '#1F6E7A'],
      ['teal on paper (eyebrows, captions)', '#1F6E7A', '#F4ECD9'],
      ['poppy on paper (issue line)', '#C5372C', '#F4ECD9'],
      ['paper-light on poppy (button)', '#FBF6EA', '#C5372C'],
      ['mustard on ink (numerals)', '#D9A21B', '#1C1A16'],
    ];
    for (const [name, fg, bg] of pairs) {
      const r = ratio(fg, bg);
      console.log(`contrast ${name}: ${r.toFixed(2)}:1`);
      expect(r, name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
