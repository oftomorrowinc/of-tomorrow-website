import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { STILLS, open } from './broadcast-pages';

// broadcast.oftomorrow.net (specs/broadcast_001.md §5 card 4): broadcast/dist,
// built by broadcast/build.mjs and served over http as Vercel serves it. Its
// stills are compared, pixel for pixel, with card 2's snapshots (the
// `published` project's snapshotPathTemplate points at
// tests/broadcast.spec.ts-snapshots/): the hosted pages are the local ones.

test.describe('the published pages look exactly like card 2\'s', () => {
	for (const [name, file, query] of STILLS) {
		test(name, async ({ page, baseURL }) => {
			const failed: string[] = [];
			page.on('requestfailed', (r) => failed.push(r.url()));
			page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
			await open(page, file, query, baseURL);
			expect(failed).toEqual([]);
			await expect(page).toHaveScreenshot(`${name}.png`, { omitBackground: true, threshold: 0 });
		});
	}
});

test('the published site is the pages, their script, styles and fonts, and nothing else', () => {
	const pages = readdirSync('broadcast').filter((f) => f.endsWith('.html')).sort();
	expect(readdirSync('broadcast/dist').sort()).toEqual([...pages, 'broadcast.css', 'fonts', 'magazine.css', 'params.js'].sort());
	// magazine.css is the site's own file, byte for byte: one source of tokens.
	expect(readFileSync('broadcast/dist/magazine.css', 'utf8')).toBe(readFileSync('src/styles/magazine.css', 'utf8'));
	for (const p of pages) expect(readFileSync(`broadcast/dist/${p}`, 'utf8'), p).not.toContain('../src/styles/magazine.css');
});

test('src= on the published split.html: a same-origin JSON list renders', async ({ page, baseURL }) => {
	await page.route('**/week.json', (r) =>
		r.fulfill({ contentType: 'application/json', body: JSON.stringify({ title: 'From src', items: [{ text: 'One', n: 101 }, { text: 'Two', n: 102 }] }) }),
	);
	await open(page, 'split.html', 'src=week.json', baseURL);
	await page.waitForFunction(() => document.documentElement.dataset.src === 'loaded');
	await expect(page.locator('.bc-title')).toHaveText('From src');
	await expect(page.locator('.bc-line .bc-marker')).toHaveText(['101', '102']);
});
