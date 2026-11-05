// The lo-fi screenshots (specs/broadcast_001.md §5 card 1): each page at
// 1920×1080 with the spec's placeholder content, over mid-grey so the
// transparent regions read. `npm run broadcast:shots`.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const COMMON = 'issue=12&date=2026-11-04&segment=Field%20Notes';
export const LIST =
	'kicker=Field%20Notes&title=Make%20it%20flow&l=Get%20your%20editor%20to%20simplify%20your%20points&l=You%20tell%20them%20what%20to%20write&l=Keep%20the%20text%20or%20the%20image%20full%20screen&reveal=3';

// In walk order (rule 26): the same list on split and full.
export const SHOTS = [
	['camera', 'camera.html', COMMON],
	['split', 'split.html', `${COMMON}&${LIST}`],
	['full-list', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1`],
	['full-title', 'full.html', `issue=12&date=2026-11-04&mode=title&kicker=The%20Ledger&title=What%20landed%20this%20week&segment=The%20Ledger`],
	['full-progress', 'full.html', `${COMMON}&mode=progress&tile=1&kicker=The%20plan%20of%20the%20issue&step=Cut%20mistakes&step=Cut%20waffle&step=Add%20the%20lists&step=Grade%20the%20colour&step=Publish&now=3`],
	['framed', 'framed.html', `${COMMON}&caption=From%20the%20archive%20%C2%B7%202024`],
	['lower', 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7`],
];

export const pageUrl = (file, query) => `${pathToFileURL(resolve('broadcast', file)).href}?${query}`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	for (const [name, file, query] of SHOTS) {
		await page.goto(pageUrl(file, query));
		await page.evaluate(() => document.fonts.ready);
		// Mid-grey behind the page — the screenshot's only, never the page's.
		await page.addStyleTag({ content: 'html { background: #808080 !important; }' });
		const out = `specs/assets/broadcast-001/01-lofi-${name}.png`;
		await page.screenshot({ path: out });
		console.log(out, '←', `broadcast/${file}?${query}`);
	}
	await browser.close();
}
