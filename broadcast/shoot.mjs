// The hi-fi screenshots (specs/broadcast_001.md §5 card 2): each page at
// 1920×1080 with the spec's placeholder content, every motion at its end, over
// mid-grey so the transparent regions read; and the dock at OBS dock width.
// `npm run broadcast:shots`. (01-lofi-*.png are card 1's record, kept as made.)
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const COMMON = 'issue=12&date=2026-11-04&segment=Field%20Notes';
export const LIST =
	'kicker=Field%20Notes&title=Make%20it%20flow&l=Get%20your%20editor%20to%20simplify%20your%20points&l=You%20tell%20them%20what%20to%20write&l=Keep%20the%20text%20or%20the%20image%20full%20screen&reveal=3';

const LEDGER = 'issue=12&date=2026-11-04&segment=The%20Ledger';

// In walk order (rule 26): the same list on split and full.
export const SHOTS = [
	['camera', 'camera.html', COMMON],
	['split', 'split.html', `${COMMON}&${LIST}`],
	['full-list', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1`],
	['full-title', 'full.html', `issue=12&date=2026-11-04&mode=title&kicker=The%20Ledger&title=What%20landed%20this%20week&segment=The%20Ledger`],
	['full-progress', 'full.html', `${COMMON}&mode=progress&tile=1&kicker=The%20plan%20of%20the%20issue&step=Cut%20mistakes&step=Cut%20waffle&step=Add%20the%20lists&step=Grade%20the%20colour&step=Publish&now=3`],
	['framed', 'framed.html', `${COMMON}&caption=From%20the%20archive%20%C2%B7%202024&tile=1`],
	['lower', 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7`],
	// theme=ink, the dark segment, on the pages that draw paper.
	['split-ink', 'split.html', `${LEDGER}&${LIST.replace('Field%20Notes', 'The%20Ledger')}&theme=ink`],
	['full-list-ink', 'full.html', `${LEDGER}&${LIST.replace('Field%20Notes', 'The%20Ledger')}&mode=list&tile=1&theme=ink`],
	['lower-ink', 'lower.html', `${LEDGER}&title=Todd%20Sampson&sub=Founder%2C%20Of%20Tomorrow&n=7&theme=ink`],
];
const PREFIX = '02-hifi';

export const pageUrl = (file, query) => `${pathToFileURL(resolve('broadcast', file)).href}?${query}`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	for (const [name, file, query] of SHOTS) {
		await page.goto(pageUrl(file, query));
		await page.evaluate(() => document.fonts.ready);
		// Every move at its end (lower.html slides in two frames after load).
		await page.waitForTimeout(100);
		await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
		// Mid-grey behind the page — the screenshot's only, never the page's.
		await page.addStyleTag({ content: 'html { background: #808080 !important; }' });
		const out = `specs/assets/broadcast-001/${PREFIX}-${name}.png`;
		await page.screenshot({ path: out });
		console.log(out, '←', `broadcast/${file}?${query}`);
	}
	// The dock, filled in for the segment above, at an OBS dock's width.
	const dock = await browser.newPage({ viewport: { width: 380, height: 900 } });
	await dock.goto(pageUrl('dock.html', `${COMMON}&${LIST.replace('reveal=3', 'reveal=2')}&lt=Todd%20Sampson&lsub=Founder%2C%20Of%20Tomorrow&ln=7&step=Cut%20mistakes&step=Cut%20waffle&step=Publish&now=2`));
	await dock.evaluate(() => document.fonts.ready);
	await dock.screenshot({ path: `specs/assets/broadcast-001/${PREFIX}-dock.png`, fullPage: true });
	console.log(`specs/assets/broadcast-001/${PREFIX}-dock.png`);
	await browser.close();
}
