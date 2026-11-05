import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { cssVar } from './tokens';

// The weekly's OBS pages (specs/broadcast_001.md §2–§3), opened as file:// the
// way OBS opens them: each renders its URL params, and nothing on any of them
// is a colour outside magazine.css's tokens (read from the computed styles,
// with the tokens read from magazine.css itself — tests/tokens.ts).

const url = (file: string, query = '') => `${pathToFileURL(resolve('broadcast', file)).href}?${query}`;

const COMMON = 'issue=12&date=2026-11-04&segment=Field%20Notes';
const LINES = ['Get your editor to simplify your points', 'You tell them what to write', 'Keep the text or the image full screen'];
const LIST = `kicker=Field%20Notes&title=Make%20it%20flow&${LINES.map((l) => `l=${encodeURIComponent(l)}`).join('&')}`;

async function open(page: Page, file: string, query: string) {
	await page.goto(url(file, query));
	await page.evaluate(() => document.fonts.ready);
}

const visibleLines = (page: Page) => page.locator('.bc-line:visible .bc-line-text');

test.describe('each page renders its params', () => {
	test('camera.html: the masthead, the issue line and the segment badge', async ({ page }) => {
		await open(page, 'camera.html', COMMON);
		await expect(page.locator('.bc-nameplate')).toHaveText(/of tomorrow/i);
		await expect(page.locator('.bc-issue')).toHaveText('Todd Sampson · No. 12 · November 2026');
		await expect(page.locator('.bc-badge')).toHaveText('Field Notes');
		await open(page, 'camera.html', 'host=Guest%20Host&issue=13&date=2026-12-01&segment=The%20Ledger');
		await expect(page.locator('.bc-issue')).toHaveText('Guest Host · No. 13 · December 2026');
		// The segment picks the accent: The Ledger is mustard.
		await expect(page.locator('html')).toHaveAttribute('data-accent', 'mustard');
	});

	test('split.html: kicker, title, and reveal=2 shows two list lines', async ({ page }) => {
		await open(page, 'split.html', `${COMMON}&${LIST}&reveal=2`);
		await expect(page.locator('.bc-kicker')).toHaveText('Field Notes');
		await expect(page.locator('.bc-title')).toHaveText('Make it flow');
		await expect(visibleLines(page)).toHaveText(LINES.slice(0, 2));
		await open(page, 'split.html', `${COMMON}&${LIST}`);
		await expect(visibleLines(page)).toHaveText(LINES);
	});

	test('full.html: mode=title, mode=list (reveal=2), mode=progress (now=2)', async ({ page }) => {
		await open(page, 'full.html', `${COMMON}&mode=title&title=What%20landed%20this%20week`);
		await expect(page.locator('.bc-headline-text')).toHaveText('What landed this week');

		await open(page, 'full.html', `${COMMON}&${LIST}&mode=list&reveal=2`);
		await expect(page.locator('.bc-title')).toHaveText('Make it flow');
		await expect(visibleLines(page)).toHaveText(LINES.slice(0, 2));

		await open(page, 'full.html', `${COMMON}&mode=progress&step=Cut%20mistakes&step=Cut%20waffle&step=Publish&now=2`);
		await expect(page.locator('.bc-step .bc-step-text')).toHaveText(['Cut mistakes', 'Cut waffle', 'Publish']);
		await expect(page.locator('.bc-step--done .bc-step-text')).toHaveText(['Cut mistakes']);
		await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText(['Cut waffle']);
		await expect(page.locator('.bc-step--next .bc-step-text')).toHaveText(['Publish']);
	});

	test('a long list comes in as list= (base64url JSON)', async ({ page }) => {
		const list = Buffer.from(JSON.stringify(['Één', 'Two & three'])).toString('base64url');
		await open(page, 'full.html', `mode=list&list=${list}`);
		await expect(visibleLines(page)).toHaveText(['Één', 'Two & three']);
	});

	test('framed.html: the 1440×810 window and its caption', async ({ page }) => {
		await open(page, 'framed.html', `${COMMON}&caption=From%20the%20archive%20%C2%B7%202024`);
		await expect(page.locator('.bc-caption')).toHaveText('From the archive · 2024');
		const box = await page.locator('.bc-window').boundingBox();
		expect([box!.width, box!.height]).toEqual([1440, 810]);
	});

	test('lower.html: title, sub, the No. marker; out=1 takes it away', async ({ page }) => {
		await open(page, 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7`);
		await expect(page.locator('.bc-lower-title')).toHaveText('Todd Sampson');
		await expect(page.locator('.bc-lower-sub')).toHaveText('Founder, Of Tomorrow');
		await expect(page.locator('.bc-lower-tab')).toHaveText('No. 7');
		await expect(page.locator('html')).toHaveAttribute('data-accent', 'mustard');
		await open(page, 'lower.html', `title=Todd%20Sampson&out=1`);
		await expect(page.locator('.bc-lower')).toBeHidden();
	});
});

test('the list stays put: split.html and full.html mode=list put every line in the same place', async ({ page }) => {
	const boxes = async () => page.locator('.bc-line').evaluateAll((els) => els.map((e) => JSON.stringify(e.getBoundingClientRect())));
	await open(page, 'split.html', `${COMMON}&${LIST}`);
	const split = await boxes();
	await open(page, 'full.html', `${COMMON}&${LIST}&mode=list&tile=1`);
	expect(await boxes()).toEqual(split);
});

/** Alpha (0–255) at points of a transparent-background screenshot. */
async function alphaAt(page: Page, points: [number, number][]) {
	const png = await page.screenshot({ omitBackground: true });
	const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return points.map(([x, y]) => data[(y * info.width + x) * info.channels + 3]);
}

test('tile=1 draws the camera tile — a 300×420 border, radius 24, with a hole the camera shows through', async ({ page }) => {
	const centre: [number, number] = [1548 + 150, 588 + 210];
	const paper: [number, number] = [960, 1040]; // below the list, the window and its caption
	for (const file of ['full.html', 'framed.html']) {
		await open(page, file, `${COMMON}&${LIST}&mode=list&tile=1`);
		const tile = page.locator('.bc-tile');
		await expect(tile).toHaveCount(1);
		const box = await tile.boundingBox();
		expect([box!.x, box!.y, box!.width, box!.height]).toEqual([1548, 588, 300, 420]);
		await expect(tile).toHaveCSS('border-radius', '24px');
		await expect(tile).toHaveCSS('border-top-width', '2px');
		expect(await alphaAt(page, [centre, paper]), file).toEqual([0, 255]);

		await open(page, file, `${COMMON}&${LIST}&mode=list`);
		await expect(page.locator('.bc-tile')).toHaveCount(0);
		if (file === 'full.html') expect(await alphaAt(page, [centre]), file).toEqual([255]);
	}
});

test('the camera shows through where there is a face: camera.html is transparent inside its rule, split.html right of its panel', async ({ page }) => {
	await open(page, 'camera.html', COMMON);
	expect(await alphaAt(page, [[1300, 540], [960, 900]])).toEqual([0, 0]);
	await open(page, 'split.html', `${COMMON}&${LIST}`);
	expect(await alphaAt(page, [[400, 900], [1300, 540]])).toEqual([255, 0]);
});

// The token set, from magazine.css's :root — a token changed there changes this.
const TOKENS = ['paper', 'paper-light', 'paper-dark', 'ink', 'poppy', 'teal', 'mustard', 'body-muted', 'caption'];
const rgb = (hex: string) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	return `rgb(${r}, ${g}, ${b})`;
};
const ALLOWED = new Set([...TOKENS.map((t) => rgb(cssVar(t))), 'rgba(0, 0, 0, 0)']);

const PAGES: [string, string][] = [
	['camera.html', COMMON],
	['split.html', `${COMMON}&${LIST}`],
	['split.html', `${COMMON}&${LIST}&marker=square&theme=ink&accent=poppy`],
	['full.html', `${COMMON}&mode=title&title=What%20landed`],
	['full.html', `${COMMON}&${LIST}&mode=list&tile=1&segment=The%20Ledger`],
	['full.html', `${COMMON}&mode=progress&tile=1&step=A&step=B&step=C&now=2&accent=poppy`],
	['full.html', `${COMMON}&mode=progress&step=A&step=B&now=1&theme=ink`],
	['framed.html', `${COMMON}&caption=From%20the%20archive&tile=1`],
	['lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder&n=7`],
	['lower.html', `${COMMON}&title=Todd%20Sampson&n=7&accent=teal`],
];

for (const [file, query] of PAGES) {
	test(`no colour outside the tokens: ${file}?${decodeURIComponent(query).slice(COMMON.length + 1) || COMMON}`, async ({ page }) => {
		await open(page, file, query);
		const found = await page.evaluate(() => {
			const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'box-shadow', 'mask-image', 'column-rule-color'];
			const SVG = ['fill', 'stroke'];
			const out: string[] = [];
			for (const el of [document.documentElement, ...document.documentElement.querySelectorAll('*')]) {
				if (el.closest('head')) continue;
				const cs = getComputedStyle(el);
				const props = el instanceof SVGElement ? [...PROPS, ...SVG] : PROPS;
				for (const p of props) {
					for (const c of cs.getPropertyValue(p).match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? []) out.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''} ${p}: ${c}`);
				}
			}
			return out;
		});
		expect(found.length).toBeGreaterThan(0);
		expect(found.filter((f) => !ALLOWED.has(f.slice(f.lastIndexOf(': ') + 2)))).toEqual([]);
	});
}
