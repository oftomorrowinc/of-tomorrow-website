// Card 4's pictures (specs/broadcast_001.md §5): split.html and full.html
// rendering from src=, fed tests/fixtures/broadcast-{landed,steps}.json — the
// shapes Signals' /api/broadcast/landed and /steps answer — over mid-grey.
// `npm run broadcast:shots:src`. No network: the feed is answered by page.route.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { COMMON, pageUrl } from './shoot.mjs';

const FEED = 'https://signals.test/api/broadcast/';
const LEDGER = 'issue=12&date=2026-11-04&segment=The%20Ledger';
const src = (p) => `src=${encodeURIComponent(FEED + p)}`;
const SHOTS = [
	['split-landed', 'split.html', `${LEDGER}&${src('landed?scope=ot.press&days=7')}`],
	['full-list-landed', 'full.html', `${LEDGER}&mode=list&tile=1&${src('landed?scope=ot.press&days=7')}`],
	['full-progress-steps', 'full.html', `${COMMON}&mode=progress&tile=1&${src('steps?scope=ot.press')}`],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.route(`${FEED}**`, (route) => {
	const name = new URL(route.request().url()).pathname.split('/').pop();
	route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(`tests/fixtures/broadcast-${name}.json`, 'utf8') });
});
for (const [name, file, query] of SHOTS) {
	await page.goto(pageUrl(file, query));
	await page.waitForFunction(() => document.documentElement.dataset.src === 'loaded');
	await page.evaluate(() => document.fonts.ready);
	await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
	await page.addStyleTag({ content: 'html { background: #808080 !important; }' });
	const out = `specs/assets/broadcast-001/04-src-${name}.png`;
	await page.screenshot({ path: out });
	console.log(out, '←', `broadcast/${file}?${decodeURIComponent(query)}`);
}
await browser.close();
