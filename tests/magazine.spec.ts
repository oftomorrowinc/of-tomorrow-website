import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FALLBACK, WORKSHOP_URL, parseFeed } from '../src/lib/workshop';

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
    expect(hrefs).toEqual([
      'https://byo-llm.com',
      'https://byollm.cloud/early-access',
      'https://translations.oftomorrow.net',
    ]);
    await expect(cards.nth(0)).toContainText('BYOLLM');
    await expect(cards.nth(1)).toContainText('BYOLLM Cloud');
    await expect(cards.nth(2)).toContainText('Translations Of Tomorrow');
  });

  test('FROM THE WORKSHOP: the two newest posts from the feed, or the static fallback', async ({ page, request }) => {
    // Sorted by pubDate desc by the same parser the build uses. If the feed is
    // unreachable here, the build (moments ago) most likely fell back too.
    let expected = FALLBACK.slice(0, 2);
    try {
      const res = await request.get(`${WORKSHOP_URL}/rss.xml`, { timeout: 10_000 });
      const posts = res.ok() ? parseFeed(await res.text()) : [];
      if (posts.length > 0) expected = posts.slice(0, 2);
    } catch (err) {
      console.log(`feed unreachable (${(err as Error).message}); expecting the static fallback`);
    }
    console.log(`expected workshop cards: ${JSON.stringify(expected.map((p) => p.title))}`);
    await page.goto('/');
    const cards = page.getByTestId('workshop-card');
    await expect(cards).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(cards.nth(i).locator('h3')).toHaveText(expected[i].title);
      await expect(cards.nth(i).locator('h3 a')).toHaveAttribute('href', expected[i].link);
    }
    await expect(page.getByTestId('all-posts')).toHaveAttribute('href', 'https://todd.oftomorrow.net');
  });

  test('both illustrations, with captions', async ({ page }) => {
    await page.goto('/');
    for (const [id, src, caption] of [
      ['fig-1', '/images/art/cover-workbench.webp', 'Fig. 1 — A machine the size of a toaster, and the town it talks to.'],
      ['fig-2', '/images/art/house-cutaway.webp', 'Fig. 2 — Every room has its own small machine. None of them phones home.'],
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

  test("the mockup's copy, word for word", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('deck')).toHaveText(
      "We have to build it. Small, single-purpose tools, well connected, running on the compute you already own – open source where it counts, and shown to you while it's being made.",
    );
    await expect(page.getByTestId('fig-1').locator('figcaption')).toHaveText(
      'Fig. 1 — A machine the size of a toaster, and the town it talks to.',
    );
    await expect(page.getByTestId('fig-2').locator('figcaption')).toHaveText(
      'Fig. 2 — Every room has its own small machine. None of them phones home.',
    );
    await expect(page.getByTestId('building-tag')).toHaveText('Three things, all real');
    const cards = page.getByTestId('building-card');
    await expect(cards.nth(0).locator('a')).toHaveText('Open source · 0.1.2 →');
    await expect(cards.nth(1).locator('a')).toHaveText('Early access →');
    await expect(cards.nth(2).locator('a')).toHaveText('Visit the site →');
    await expect(page.getByTestId('write-line')).toHaveText('Building something, or want to? The door is open.');
    await expect(page.getByTestId('footer-copyright')).toHaveText('© 2026 Of Tomorrow, Inc.');
    await expect(page.getByTestId('footer-links').locator('a')).toHaveText([
      'byo-llm.com',
      'byollm.cloud',
      'todd.oftomorrow.net',
      'Privacy',
    ]);
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
