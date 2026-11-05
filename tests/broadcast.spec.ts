import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
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
	await settle(page);
}

/** Fonts in, and every motion on the page at its end. */
async function settle(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	// lower.html starts its slide two frames after load.
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
	await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
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

	test('lower.html: title, sub, the No. marker in the scene\'s one accent; out=1 takes it away', async ({ page }) => {
		await open(page, 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7`);
		await expect(page.locator('.bc-lower-title')).toHaveText('Todd Sampson');
		await expect(page.locator('.bc-lower-sub')).toHaveText('Founder, Of Tomorrow');
		await expect(page.locator('.bc-lower-tab')).toHaveText('No. 7');
		// §4 (one accent per scene) over §2.5's "mustard by default": the tab is
		// the segment's accent, the badge's, so Field Notes is teal on both.
		await expect(page.locator('html')).toHaveAttribute('data-accent', 'teal');
		await expect(page.locator('.bc-lower')).toBeVisible();
		await open(page, 'lower.html', `title=Todd%20Sampson&out=1`);
		await expect(page.locator('.bc-lower')).toBeHidden();
		// lt/lsub/ln are the dock's names for the same three, and win over them.
		await open(page, 'lower.html', `title=Segment&lt=Todd%20Sampson&lsub=Founder&ln=8`);
		await expect(page.locator('.bc-lower-title')).toHaveText('Todd Sampson');
		await expect(page.locator('.bc-lower-tab')).toHaveText('No. 8');
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
	['lower.html', `${COMMON}&title=Todd%20Sampson&n=7&accent=mustard&theme=ink`],
	['camera.html', `${COMMON}&theme=ink&segment=The%20Ledger`],
	['full.html', `${COMMON}&${LIST}&mode=list&tile=1&theme=ink`],
	['dock.html', ''],
];

for (const [file, query] of PAGES) {
	const shown = query.startsWith(`${COMMON}&`) ? query.slice(COMMON.length + 1) : query;
	test(`no colour outside the tokens: ${file}?${decodeURIComponent(shown)}`, async ({ page }) => {
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

// ---- motion (§4), the dock, and the pictures at the end of each move ------

/** The dock and a page, open together in one browser context — as OBS holds
 *  a custom dock and its browser sources. */
async function withDock(context: BrowserContext, file: string, query: string) {
	const page = await context.newPage();
	await open(page, file, query);
	const dock = await context.newPage();
	await dock.setViewportSize({ width: 380, height: 1200 });
	await dock.goto(url('dock.html'));
	await dock.evaluate(() => document.fonts.ready);
	return { page, dock };
}

/** Type a list into the dock, one row per line. */
async function dockLines(dock: Page, lines: string[]) {
	for (const l of lines) {
		await dock.click('#add-line');
		await dock.keyboard.type(l);
	}
}

const animations = (page: Page, selector: string) =>
	page.locator(selector).evaluateAll((els) =>
		els.map((e) =>
			e.getAnimations().map((a) => {
				const t = (a.effect as KeyframeEffect).getTiming();
				const k = (a.effect as KeyframeEffect).getKeyframes();
				return { duration: t.duration, from: { opacity: k[0].opacity, transform: k[0].transform } };
			}),
		),
	);

test('reveal: a line the dock reveals rises 12px and fades in over 220ms; lines already shown do not move; nothing moves on load', async ({ context }) => {
	const { page, dock } = await withDock(context, 'split.html', `${COMMON}&${LIST}&reveal=1`);
	expect(await animations(page, '.bc-line')).toEqual([[], [], []]);

	await dockLines(dock, LINES);
	await dock.fill('#title', 'Make it flow');
	await dock.click('#reveal-plus'); // 1 — the dock's first write: line 1 arrives
	await dock.click('#reveal-plus'); // 2
	await expect(visibleLines(page)).toHaveText(LINES.slice(0, 2));
	const [first, second] = await animations(page, '.bc-line');
	expect(second).toEqual([{ duration: 220, from: { opacity: '0', transform: 'translateY(12px)' } }]);
	// Line 1 was already up when 2 came in: it is not re-run.
	expect(first).toEqual([]);
	await expect(page.locator('.bc-line:visible')).toHaveCount(2);
	// No blur, anywhere (§4: the reference's blur-in is the one thing not copied).
	for (const f of readdirSync('broadcast').filter((f) => /\.(css|html|js)$/.test(f))) expect(readFileSync(join('broadcast', f), 'utf8'), f).not.toMatch(/blur\(/);
});

test('the lower-third slides in along the bottom rule in 500ms, and out on Out', async ({ context }) => {
	const page = await context.newPage();
	await page.goto(url('lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder&n=7`));
	const plate = page.locator('.bc-lower');
	await page.waitForFunction(() => document.querySelector('.bc-lower')!.getAnimations().length > 0);
	expect(await plate.evaluate((e) => e.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, (a.effect as KeyframeEffect).getTiming().duration]).filter(([p]) => p === 'transform'))).toEqual([['transform', 500]]);
	// Mid-slide it is left of home, on the same baseline (along the rule, not up from it).
	const mid = await plate.boundingBox();
	await settle(page);
	const home = await plate.boundingBox();
	expect(home!.x).toBe(48);
	expect(home!.y + home!.height).toBe(1080 - 26);
	expect(mid!.x).toBeLessThan(home!.x);
	expect(mid!.y).toBe(home!.y);
	// Clipped at the rule's inner edge: it never shows left of x=26.
	await expect(page.locator('.bc-lower-track')).toHaveCSS('overflow', 'hidden');
	await expect(page.locator('.bc-lower-track')).toHaveCSS('left', '26px');

	const dock = await context.newPage();
	await dock.goto(url('dock.html'));
	await dock.fill('#lt', 'Todd Sampson');
	await dock.click('#lower-out');
	await page.waitForFunction(() => document.querySelector('.bc-lower')!.getAnimations().length > 0);
	// Out takes the same 500ms, and the plate stays visible until it is home behind the frame.
	expect(await plate.evaluate((e) => e.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, (a.effect as KeyframeEffect).getTiming().duration]).filter(([p]) => p === 'transform'))).toEqual([['transform', 500]]);
	await settle(page);
	await expect(plate).toBeHidden();
	await dock.click('#lower-in');
	await settle(page);
	await expect(plate).toBeVisible();
	await expect(page.locator('.bc-lower-title')).toHaveText('Todd Sampson');
});

test('split → full: the list keeps its left edge and type size, in both themes', async ({ page }) => {
	for (const theme of ['paper', 'ink']) {
		const metrics = () =>
			page.locator('.bc-line, .bc-title, .bc-kicker').evaluateAll((els) =>
				els.map((e) => {
					const r = e.getBoundingClientRect();
					return [e.className, r.left, r.top, getComputedStyle(e).fontSize, getComputedStyle(e).color].join(' ');
				}),
			);
		await open(page, 'split.html', `${COMMON}&${LIST}&theme=${theme}`);
		const split = await metrics();
		await open(page, 'full.html', `${COMMON}&${LIST}&mode=list&tile=1&theme=${theme}`);
		expect(await metrics(), theme).toEqual(split);
	}
});

test('theme=ink inverts paper and ink on every page that draws', async ({ page }) => {
	const ground = async (sel: string, prop = 'background-color') => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);
	const [paper, ink] = [rgb(cssVar('paper')), rgb(cssVar('ink'))];
	for (const [file, sel, prop] of [
		['split.html', '.bc-panel', 'background-color'],
		['full.html', '.bc-matte', 'fill'],
		['camera.html', '.bc-masthead', 'background-color'],
		['lower.html', '.bc-lower', 'background-color'],
	] as const) {
		await open(page, file, `${COMMON}&${LIST}&mode=list&title=T`);
		expect(await ground(sel, prop), file).toBe(paper);
		expect(await ground('body', 'color'), file).toBe(ink);
		await open(page, file, `${COMMON}&${LIST}&mode=list&title=T&theme=ink`);
		expect(await ground(sel, prop), `${file} ink`).toBe(ink);
		expect(await ground('body', 'color'), `${file} ink`).toBe(paper);
	}
});

test('the camera tile: 2px border in the fore colour, a hard paper-dark offset shadow, and the hole stays clear of it', async ({ page }) => {
	await open(page, 'full.html', `${COMMON}&mode=title&title=T&tile=1`);
	await expect(page.locator('.bc-tile')).toHaveCSS('box-shadow', `${rgb(cssVar('paper-dark'))} 12px 12px 0px 0px`);
	await expect(page.locator('.bc-tile')).toHaveCSS('border-top-color', rgb(cssVar('ink')));
	// Inside the border the camera shows (alpha 0); the shadow lies only outside, lower right.
	expect(await alphaAt(page, [[1548 + 4, 588 + 30], [1548 + 300 + 6, 588 + 210], [1548 - 6, 588 + 210]])).toEqual([0, 255, 255]);
});

test.describe('the dock drives every page through storage', () => {
	test('title, list, reveal, theme: one write reaches split, full and camera in the same context', async ({ context }) => {
		const { page: split, dock } = await withDock(context, 'split.html', `${COMMON}&title=From%20the%20URL&l=URL%20line`);
		const full = await context.newPage();
		await open(full, 'full.html', `${COMMON}&mode=list&tile=1&l=URL%20line`);
		const camera = await context.newPage();
		await open(camera, 'camera.html', COMMON);
		// Loaded before the dock wrote anything: the URL is what shows.
		await expect(split.locator('.bc-title')).toHaveText('From the URL');

		await dock.fill('#segment', 'The Ledger');
		await dock.fill('#issue', '13');
		await dock.fill('#date', '2026-12-01');
		await dock.fill('#title', 'Make it flow');
		await dockLines(dock, LINES);
		for (let i = 0; i < 3; i++) await dock.click('#reveal-plus');
		for (const p of [split, full]) {
			await expect(p.locator('.bc-title')).toHaveText('Make it flow');
			await expect(visibleLines(p)).toHaveText(LINES);
			await expect(p.locator('html')).toHaveAttribute('data-accent', 'mustard');
		}
		await expect(camera.locator('.bc-badge')).toHaveText('The Ledger');
		await expect(camera.locator('.bc-issue')).toHaveText('Todd Sampson · No. 13 · December 2026');
		// mode and tile are the page's own, from its URL: the dock does not own them.
		await expect(full.locator('html')).toHaveAttribute('data-mode', 'list');
		await expect(full.locator('.bc-tile')).toHaveCount(1);

		await dock.click('#reveal-minus');
		await expect(visibleLines(split)).toHaveText(LINES.slice(0, 2));
		await dock.click('#theme-ink');
		for (const p of [split, full, camera]) await expect(p.locator('html')).toHaveAttribute('data-theme', 'ink');
	});

	test('drag to reorder: the rows move and so do the lines on air', async ({ context }) => {
		const { page, dock } = await withDock(context, 'split.html', COMMON);
		await dockLines(dock, ['First', 'Second', 'Third']);
		await dock.locator('#lines .d-line').nth(2).dragTo(dock.locator('#lines .d-line').nth(0));
		await expect(page.locator('.bc-line-text')).toHaveText(['Third', 'First', 'Second']);
		// The same by keyboard, in the line: Alt+↓.
		await dock.locator('#lines input').nth(0).press('Alt+ArrowDown');
		await expect(page.locator('.bc-line-text')).toHaveText(['First', 'Third', 'Second']);
		await dock.locator('#lines .d-x').nth(1).click();
		await expect(page.locator('.bc-line-text')).toHaveText(['First', 'Second']);
	});

	test('progress now ± moves the current step on full.html mode=progress', async ({ context }) => {
		const { page, dock } = await withDock(context, 'full.html', `${COMMON}&mode=progress`);
		for (const s of ['Cut mistakes', 'Cut waffle', 'Publish']) {
			await dock.click('#add-step');
			await dock.keyboard.type(s);
		}
		await dock.click('#now-plus');
		await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText('Cut waffle');
		await expect(page.locator('.bc-step--done .bc-step-text')).toHaveText(['Cut mistakes']);
		await dock.click('#now-plus');
		await dock.click('#now-plus'); // clamps at the last step
		await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText('Publish');
		await dock.click('#now-minus');
		await expect(page.locator('.bc-step--now .bc-step-text')).toHaveText('Cut waffle');
	});

	test('one contract: the dock shows its state as the query a URL takes, and a page loaded with it renders the same', async ({ context }) => {
		const { page, dock } = await withDock(context, 'split.html', COMMON);
		await dock.fill('#title', 'Make it flow');
		await dockLines(dock, LINES);
		await dock.click('#reveal-plus');
		await expect(visibleLines(page)).toHaveText(LINES.slice(0, 1));
		const query = await dock.locator('#url').inputValue();
		const fresh = await context.browser()!.newContext({ viewport: { width: 1920, height: 1080 } });
		const p2 = await fresh.newPage();
		await open(p2, 'split.html', query);
		await expect(p2.locator('.bc-title')).toHaveText('Make it flow');
		await expect(visibleLines(p2)).toHaveText(LINES.slice(0, 1));
		await fresh.close();
	});

	test('URL wins on load: a page loaded after the dock wrote shows its own URL keys, and the dock fills the rest', async ({ context }) => {
		const { dock } = await withDock(context, 'camera.html', COMMON);
		await dock.fill('#title', 'From the dock');
		await dockLines(dock, ['Dock line']);
		const page = await context.newPage();
		await open(page, 'split.html', 'title=From%20the%20URL');
		await expect(page.locator('.bc-title')).toHaveText('From the URL');
		await expect(page.locator('.bc-line-text')).toHaveText(['Dock line']);
		// And the dock after: its next write wins.
		await dock.fill('#title', 'From the dock again');
		await expect(page.locator('.bc-title')).toHaveText('From the dock again');
	});

	test('a title too long to fit is flagged in the dock, and never on air', async ({ context }) => {
		const { page, dock } = await withDock(context, 'split.html', COMMON);
		await dock.fill('#title', 'Short');
		await expect(dock.locator('#title-warn')).toBeHidden();
		await dock.fill('#title', 'A title that runs on and on far past where any split panel could ever hold it');
		await expect(dock.locator('#title-warn')).toBeVisible();
		await expect(dock.locator('#title')).toHaveClass(/d-toolong/);
		expect(await page.locator('.d-toolong, .d-warn').count()).toBe(0);
	});
});

// The pictures, compared at the end of each move (Playwright snapshots in
// tests/broadcast.spec.ts-snapshots/). `npm run test:broadcast -- -u` remakes
// them after a change meant to change the look.
test.describe('screenshots at the end of each motion', () => {
	const shot = (page: Page, name: string) => expect(page).toHaveScreenshot(`${name}.png`, { omitBackground: true, threshold: 0 });

	test('split: before and after a reveal', async ({ context }) => {
		const { page, dock } = await withDock(context, 'split.html', `${COMMON}&${LIST}&reveal=1`);
		await shot(page, 'split-reveal-1');
		await dock.fill('#title', 'Make it flow');
		await dock.fill('#kicker', 'Field Notes');
		await dockLines(dock, LINES);
		for (let i = 0; i < 3; i++) await dock.click('#reveal-plus');
		await expect(visibleLines(page)).toHaveCount(3);
		await settle(page);
		await shot(page, 'split-reveal-3');
	});

	test('lower-third: in, then out', async ({ context }) => {
		const { page, dock } = await withDock(context, 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7`);
		await shot(page, 'lower-in');
		await dock.click('#lower-out');
		await page.waitForFunction(() => document.querySelector('.bc-lower')!.getAnimations().length > 0);
		await settle(page);
		await shot(page, 'lower-out');
	});

	for (const [name, file, query] of [
		['camera', 'camera.html', COMMON],
		['full-list-tile', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1`],
		['full-title', 'full.html', `issue=12&date=2026-11-04&segment=The%20Ledger&mode=title&title=What%20landed%20this%20week`],
		['full-progress', 'full.html', `${COMMON}&mode=progress&tile=1&kicker=The%20plan%20of%20the%20issue&step=Cut%20mistakes&step=Cut%20waffle&step=Add%20the%20lists&step=Publish&now=2`],
		['framed', 'framed.html', `${COMMON}&caption=From%20the%20archive%20%C2%B7%202024&tile=1`],
		['camera-ink', 'camera.html', `${COMMON}&theme=ink`],
		['split-ink', 'split.html', `${COMMON}&${LIST}&theme=ink`],
		['full-list-tile-ink', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1&theme=ink`],
		['lower-ink', 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder&n=7&theme=ink`],
	] as const) {
		test(name, async ({ page }) => {
			await open(page, file, query);
			await shot(page, name);
		});
	}
});

test('the accent as text clears 3:1 on its ground in every theme × accent (the kicker is large type)', async ({ page }) => {
	const lum = (c: string) => {
		const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map((v) => Number(v) / 255);
		const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	};
	for (const theme of ['paper', 'ink'])
		for (const accent of ['poppy', 'teal', 'mustard']) {
			await open(page, 'split.html', `${COMMON}&${LIST}&theme=${theme}&accent=${accent}`);
			const fg = await page.locator('.bc-kicker').evaluate((e) => getComputedStyle(e).color);
			const bg = await page.locator('.bc-panel').evaluate((e) => getComputedStyle(e).backgroundColor);
			const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
			expect((hi + 0.05) / (lo + 0.05), `${theme} ${accent}`).toBeGreaterThanOrEqual(3);
		}
});
