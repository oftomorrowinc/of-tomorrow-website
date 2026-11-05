import type { Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// What the broadcast specs share: the pages' URLs, the placeholder content, and
// the stills compared pixel for pixel — tests/broadcast.spec.ts against its
// snapshots (file://, card 2), tests/broadcast.published.spec.ts against the
// SAME snapshots over http from broadcast/dist (card 4).

/** A page as OBS opens it (file://), or under `base` (the published site). */
export const url = (file: string, query = '', base?: string) =>
	`${base ? new URL(file, base).href : pathToFileURL(resolve('broadcast', file)).href}?${query}`;

export const COMMON = 'issue=12&date=2026-11-04&segment=Field%20Notes';
export const LINES = ['Get your editor to simplify your points', 'You tell them what to write', 'Keep the text or the image full screen'];
export const LIST = `kicker=Field%20Notes&title=Make%20it%20flow&${LINES.map((l) => `l=${encodeURIComponent(l)}`).join('&')}`;

export async function open(page: Page, file: string, query: string, base?: string) {
	await page.goto(url(file, query, base));
	await settle(page);
}

/** Fonts in, and every motion on the page at its end. */
export async function settle(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	// lower.html starts its slide two frames after load.
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
	await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
}

/** The stills: [snapshot name, page, query]. */
export const STILLS = [
	['camera', 'camera.html', COMMON],
	['full-list-tile', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1`],
	['full-title', 'full.html', `issue=12&date=2026-11-04&segment=The%20Ledger&mode=title&title=What%20landed%20this%20week`],
	['full-progress', 'full.html', `${COMMON}&mode=progress&tile=1&kicker=The%20plan%20of%20the%20issue&step=Cut%20mistakes&step=Cut%20waffle&step=Add%20the%20lists&step=Publish&now=2`],
	['framed', 'framed.html', `${COMMON}&caption=From%20the%20archive%20%C2%B7%202024&tile=1`],
	['camera-ink', 'camera.html', `${COMMON}&theme=ink`],
	['split-ink', 'split.html', `${COMMON}&${LIST}&theme=ink`],
	['full-list-tile-ink', 'full.html', `${COMMON}&${LIST}&mode=list&tile=1&theme=ink`],
	['lower-ink', 'lower.html', `${COMMON}&title=Todd%20Sampson&sub=Founder&n=7&theme=ink`],
] as const;
