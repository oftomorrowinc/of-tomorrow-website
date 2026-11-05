import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { COMMON, open, settle, url } from './broadcast-pages';

// src= (specs/broadcast_001.md §3, §5 card 4): split.html and full.html take
// their list or their progress from a JSON URL —
//   { title, kicker?, items: [{ text, n?, done? }], now? }
// — the shape Signals' two read-only feeds answer (/api/broadcast/landed and
// /api/broadcast/steps; tests/fixtures/broadcast-*.json are that contract).
// The feed is served here by page.route, so no network and no ledger.

const LANDED = JSON.parse(readFileSync('tests/fixtures/broadcast-landed.json', 'utf8'));
const STEPS = JSON.parse(readFileSync('tests/fixtures/broadcast-steps.json', 'utf8'));
const FEED = 'https://signals.test/api/broadcast/';
const src = (path: string) => `src=${encodeURIComponent(FEED + path)}`;

type Seen = { url: string; auth: string | null }[];

/** Answer FEED/<path> with `body` (status 200 unless given); record each request. */
async function serve(page: Page, routes: Record<string, unknown>, status = 200): Promise<Seen> {
	const seen: Seen = [];
	await page.route(`${FEED}**`, async (route) => {
		const req = route.request();
		seen.push({ url: req.url(), auth: await req.headerValue('authorization') });
		const path = new URL(req.url()).pathname.replace('/api/broadcast/', '');
		const body = routes[path];
		await route.fulfill({
			status: body === undefined ? 404 : status,
			headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization' },
			contentType: 'application/json',
			body: typeof body === 'string' ? body : JSON.stringify(body ?? { error: 'not found' }),
		});
	});
	return seen;
}

async function openSrc(page: Page, file: string, query: string) {
	await open(page, file, query);
	await page.waitForFunction(() => ['loaded', 'failed'].includes(document.documentElement.dataset.src ?? ''));
	await settle(page);
}

const visibleLines = (page: Page) => page.locator('.bc-line:visible .bc-line-text');

test('split.html src=: the feed\'s title, kicker and items as the list, each card number as its marker', async ({ page }) => {
	await serve(page, { landed: LANDED });
	await openSrc(page, 'split.html', `${COMMON}&${src('landed?scope=ot.press&days=7')}`);
	await expect(page.locator('html')).toHaveAttribute('data-src', 'loaded');
	await expect(page.locator('.bc-kicker')).toHaveText('The Ledger');
	await expect(page.locator('.bc-title')).toHaveText('What landed this week');
	await expect(visibleLines(page)).toHaveText(LANDED.items.map((i: { text: string }) => i.text));
	await expect(page.locator('.bc-line .bc-marker')).toHaveText(['7293', '1198', '975']);
	// The chips grow to fit a card number, all one width, so the text lines up.
	const boxes = await page.locator('.bc-line .bc-marker').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
	expect(new Set(boxes.map(Math.round)).size).toBe(1);
	expect(boxes[0]).toBeGreaterThan(46);
	const left = await page.locator('.bc-line-text').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
	expect(new Set(left).size).toBe(1);
});

test('full.html mode=list src=: the same list, and reveal still counts its lines', async ({ page }) => {
	await serve(page, { landed: LANDED });
	await openSrc(page, 'full.html', `${COMMON}&mode=list&reveal=2&${src('landed?scope=ot.press&days=7')}`);
	await expect(visibleLines(page)).toHaveText(LANDED.items.slice(0, 2).map((i: { text: string }) => i.text));
});

test('full.html mode=progress src=: steps from items, done from the feed, now from the feed', async ({ page }) => {
	await serve(page, { steps: STEPS });
	await openSrc(page, 'full.html', `${COMMON}&mode=progress&tile=1&${src('steps?scope=ot.press')}`);
	await expect(page.locator('.bc-step .bc-step-text')).toHaveText(['Lo-fi', 'Hi-fi + the dock', 'Stinger + scenes', 'Publish + data']);
	await expect(page.locator('.bc-step--done .bc-step-text')).toHaveText(['Lo-fi', 'Hi-fi + the dock']);
	await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText(['Stinger + scenes']);
	await expect(page.locator('.bc-step--next .bc-step-text')).toHaveText(['Publish + data']);
	await expect(page.locator('.bc-progress-kicker')).toHaveText('The plan of the issue');
});

test('progress without now: the first step not done is current; without done flags, now places them', async ({ page }) => {
	const { now: _now, ...noNow } = STEPS;
	await serve(page, { a: noNow, b: { title: 'x', items: [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }], now: 2 } });
	await openSrc(page, 'full.html', `${COMMON}&mode=progress&${src('a')}`);
	await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText(['Stinger + scenes']);
	await openSrc(page, 'full.html', `${COMMON}&mode=progress&${src('b')}`);
	await expect(page.locator('.bc-step--done .bc-step-text')).toHaveText(['One']);
	await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText(['Two']);
	await expect(page.locator('.bc-step--next .bc-step-text')).toHaveText(['Three']);
});

test('key= goes as Authorization: Bearer, never in the feed\'s URL; no key, no header', async ({ page }) => {
	const seen = await serve(page, { landed: LANDED });
	await openSrc(page, 'split.html', `${COMMON}&key=bk_read_123&${src('landed?scope=ot.press&days=7')}`);
	await openSrc(page, 'split.html', `${COMMON}&${src('landed?scope=ot.press&days=7')}`);
	expect(seen.map((s) => s.auth)).toEqual(['Bearer bk_read_123', null]);
	expect(seen[0].url).toBe(`${FEED}landed?scope=ot.press&days=7`);
});

test('the URL\'s own title and kicker beat the feed\'s', async ({ page }) => {
	await serve(page, { landed: LANDED });
	await openSrc(page, 'split.html', `${COMMON}&title=This%20week&kicker=Ledger&${src('landed')}`);
	await expect(page.locator('.bc-title')).toHaveText('This week');
	await expect(page.locator('.bc-kicker')).toHaveText('Ledger');
	await expect(visibleLines(page)).toHaveCount(3);
});

for (const [why, status, body] of [
	['a 401', 401, { error: 'unauthenticated' }],
	['not the shape', 200, { title: 'x', items: [{ name: 'no text' }] }],
	['not JSON', 200, '<html>'],
] as const) {
	test(`a feed that fails (${why}) leaves the URL's own list on air, and says so on <html data-src>`, async ({ page }) => {
		await serve(page, { landed: body }, status);
		await openSrc(page, 'split.html', `${COMMON}&title=Typed&l=Typed%20line&${src('landed')}`);
		await expect(page.locator('html')).toHaveAttribute('data-src', 'failed');
		await expect(page.locator('.bc-title')).toHaveText('Typed');
		await expect(visibleLines(page)).toHaveText(['Typed line']);
	});
}

test('the dock still drives a src= page: its reveal and theme apply; its title and lines do not replace the feed\'s', async ({ context }) => {
	const page = await context.newPage();
	await serve(page, { landed: LANDED });
	await openSrc(page, 'split.html', `${COMMON}&${src('landed')}`);
	const dock = await context.newPage();
	await dock.setViewportSize({ width: 380, height: 1200 });
	await dock.goto(url('dock.html'));
	await dock.fill('#title', 'From the dock');
	await dock.click('#add-line');
	await dock.keyboard.type('A dock line');
	await dock.click('#theme-ink');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink');
	await expect(page.locator('.bc-title')).toHaveText('What landed this week');
	// The dock's reveal counts the feed's lines (its own list has one line, so
	// reveal is at most 1 there): one line of the feed's three is up.
	const reveal = Number(new URLSearchParams(await dock.evaluate(() => localStorage.getItem('oftomorrow.broadcast.params') ?? '')).get('reveal'));
	expect(reveal).toBeLessThanOrEqual(1);
	await expect(visibleLines(page)).toHaveText(LANDED.items.slice(0, reveal).map((i: { text: string }) => i.text));
	await expect(page.locator('.bc-line-text', { hasText: 'A dock line' })).toHaveCount(0);
});
