import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The few things only a browser can prove, against the build (playwright.config.ts):
// what the page does AFTER it loads — its own read of the feed — and how it
// lays out on a phone. Everything about the markup is under Vitest
// (tests/*.test.ts, `npm test`); this file runs at landing (`npm run verify`).

const FEED = 'http://localhost:4398/api/log';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/log-feed.json', import.meta.url), 'utf8'));

const CLAIM = {
	lane: 'ot.signals:ccs',
	by: 'ccs, for todd',
	id: '915',
	title: 'A backlog card does not wait on the icebox',
	scope: 'ot.signals',
	since: '2026-10-13T23:00:00.000Z',
	elapsed_seconds: 2220,
	line: 'ccs is on #915 for 37m',
};

const NEWER = {
	seq: 108,
	at: '2026-10-14T00:30:00.000Z',
	kind: 'job.done',
	scope: 'ot.signals',
	project: 'Signals',
	people: ['ccs', 'todd'],
	by: 'ccs, for todd',
	title: 'Newer than the build',
	body: 'Arrived after the site was built.',
	link: 'https://signals.oftomorrow.net/board?scope=ot.signals&card=960',
	id: '960',
	worked: '12m',
};

/** Answer the browser's reads of the feed: the fixture's entries after its
 *  `since` (plus `extra`), and `live`. */
async function feed(page: Page, opts: { live?: object[]; extra?: object[] } = {}) {
	const asked: string[] = [];
	await page.route(`${FEED}**`, async (route) => {
		const url = new URL(route.request().url());
		asked.push(url.search);
		const since = Number(url.searchParams.get('since') ?? 0);
		const limit = Number(url.searchParams.get('limit') ?? 50);
		const entries = [...(opts.extra ?? []), ...fixture.entries].filter((e: any) => e.seq > since).slice(0, limit);
		await route.fulfill({
			headers: { 'access-control-allow-origin': '*' },
			contentType: 'application/json',
			body: JSON.stringify({ entries, live: opts.live ?? [], next_since: since }),
		});
	});
	return asked;
}

// Browser: the live line and the newer entry are written by src/lib/log-client.ts
// from the browser's own fetch after load; the built HTML has neither.
test('/log: the live line arrives from the feed, and a newer entry lands on top of its day', async ({ page }) => {
	const asked = await feed(page, { live: [CLAIM], extra: [NEWER] });
	await page.goto('/log');
	await expect(page.getByTestId('log-live')).toHaveText('ccs is on #915 for 37m');
	await expect(page.getByTestId('log-live').getByRole('link', { name: '#915' })).toHaveAttribute(
		'href',
		'https://signals.oftomorrow.net/board?scope=ot.signals&card=915',
	);
	await expect(page.getByTestId('log-entry').first()).toHaveAttribute('data-seq', '108');
	// 00:30Z on the 14th is 8:30 pm on the 13th in New York: today's day, not a new one.
	await expect(page.getByTestId('log-day')).toHaveCount(3);
	await expect(page.getByTestId('log-day').first().getByTestId('log-entry').first()).toHaveAttribute('data-seq', '108');
	await expect(page.getByTestId('log-entry')).toHaveCount(fixture.entries.length + 1);
	// It asked only for what the build did not have.
	expect(asked[0]).toContain('since=107');
	expect(asked[0]).toContain('live=1');
});

// Browser: "absent" is a claim about the page after the browser's read of the
// feed has come back and been applied, which no render of the HTML can make.
test('home: no claim, no live line — and no "idle" either', async ({ page }) => {
	const responded = page.waitForResponse((r) => r.url().startsWith(FEED));
	await page.goto('/');
	await responded;
	const strip = page.getByTestId('log-strip');
	await expect(strip.getByTestId('strip-entry')).toHaveCount(5);
	await expect(strip.getByTestId('log-live')).toHaveCount(0);
	await expect(strip.locator('[data-live]')).toBeHidden();
	await expect(strip).not.toContainText(/idle/i);
});

// Browser: the strip redraws from the browser's fetch; "above" is layout.
test('home: a claim puts the live line above the strip, and a newer entry redraws it, still five', async ({ page }) => {
	await feed(page, { live: [CLAIM], extra: [NEWER] });
	await page.goto('/');
	const strip = page.getByTestId('log-strip');
	const entries = strip.getByTestId('strip-entry');
	await expect(strip.getByTestId('log-live')).toHaveText('ccs is on #915 for 37m');
	await expect(entries.first()).toHaveAttribute('data-seq', '108');
	await expect(entries).toHaveCount(5);
	const [live, first] = await Promise.all([strip.getByTestId('log-live').boundingBox(), entries.first().boundingBox()]);
	expect(live!.y).toBeLessThan(first!.y);
});

// Browser: overflow and line wrapping are layout — the real fonts, the real
// CSS, a 390px viewport.
test('phone: no horizontal scroll at 390px on / or /log; the departments line is two centred lines', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	for (const path of ['/', '/log']) {
		await page.goto(path);
		await page.evaluate(() => document.fonts.ready);
		const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
		console.log(`${path} scrollWidth at 390px: ${scroll}`);
		expect(scroll, path).toBeLessThanOrEqual(390);
	}
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);
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
});

// Today at Of Tomorrow (specs/news_001.md §6, card 1 lo-fi): how many cards a
// reader sees, the arrows, and /today's ?project= / ?author= filters, which
// run in the browser because the page is static.
test.describe('today', () => {
	const inView = (page: Page) =>
		page.$$eval('[data-testid="strip-card"]', (cells) => {
			const track = cells[0].parentElement!.getBoundingClientRect();
			return cells.filter((c) => {
				const r = c.getBoundingClientRect();
				return r.left >= track.left - 1 && r.right <= track.right + 1;
			}).length;
		});

	test('the strip shows three cards on a desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');
		expect(await inView(page)).toBe(3);
		await expect(page.locator('[data-today-prev]')).toBeDisabled();
	});

	test('one on a phone, the arrows move one card at a time, nothing overflows', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');
		expect(await inView(page)).toBe(1);
		const first = () => page.$$eval('[data-testid="strip-card"]', (cells) => {
			const left = cells[0].parentElement!.getBoundingClientRect().left;
			return cells.findIndex((c) => Math.abs(c.getBoundingClientRect().left - left) < 2);
		});
		expect(await first()).toBe(0);
		await page.locator('[data-today-next]').click();
		await expect.poll(first).toBe(1);
		await page.locator('[data-today-prev]').click();
		await expect.poll(first).toBe(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	});

	test('a card opens its story on /today', async ({ page }) => {
		await page.goto('/');
		const slug = await page.locator('[data-testid="strip-card"] [data-slug]').first().getAttribute('data-slug');
		await page.locator('[data-testid="strip-card"] a').first().click();
		await expect(page).toHaveURL(new RegExp(`/today#${slug}$`));
		await expect(page.locator(`#${slug}`)).toBeVisible();
	});

	test('/today?project= and ?author= narrow the page, and the empty days go', async ({ page }) => {
		await page.goto('/today?project=press');
		const visible = page.locator('[data-testid="story"]:visible');
		await expect(visible).toHaveCount(1);
		await expect(visible.first()).toHaveAttribute('data-project', 'press');
		await expect(page.locator('[data-filter-value="press"]')).toHaveAttribute('aria-current', 'page');
		await expect(page.locator('[data-filter-key=""]')).not.toHaveAttribute('aria-current', 'page');

		await page.goto('/today?project=studio');
		await expect(visible).toHaveCount(0);
		await expect(page.locator('[data-testid="today-day"]:visible')).toHaveCount(0);

		await page.goto('/today?author=cw');
		await expect(visible).toHaveCount(await page.locator('[data-testid="story"][data-author="cw"]').count());

		await page.goto('/today');
		await expect(visible).toHaveCount(await page.locator('[data-testid="story"]').count());
	});
});
