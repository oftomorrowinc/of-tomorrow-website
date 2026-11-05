// news_001 card 1's record (rule 27, lo-fi; rule 26, the walk): builds the
// site with the dateline pinned to 2026-11-05 against the fixture build-log
// feed, serves it, and writes specs/assets/news-001/01-lofi-*.png (the strip
// and /today at 1280 and 390) and 01-lofi-walk.mp4 (the homepage with three
// cards, a card opened on /today, then /today filtered by project).
// `npm run today:shots`. Needs ffmpeg for the walk.
//
// Card 3's record (the strip with real pictures): `npm run today:shots -- --card=3`
// writes the same shots as 03-*.png and 03-walk.mp4, and the walk also steps
// the strip's arrows through every card's picture.
//
// Card 4's record (hi-fi, the motion): `npm run today:shots -- --card=4` writes
// 02-hifi-*.png (the same shots, plus the strip under reduced motion,
// 02-hifi-home-still-*.png) and 02-hifi-walk.mp4, in which the strip advances
// on its own twice, holds still under the pointer, then moves on again.
import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'specs/assets/news-001';
const CARD3 = process.argv.includes('--card=3');
const CARD4 = process.argv.includes('--card=4');
const PREFIX = CARD4 ? '02-hifi' : CARD3 ? '03' : '01-lofi';
const PORT = 4397;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const feed = spawn('node', ['tests/fixtures/log-feed.mjs'], { stdio: 'ignore' });
const env = { ...process.env, TODAY_DATE: '2026-11-05', LOG_FEED_URL: 'http://localhost:4398/api/log' };
const kill = () => {
	feed.kill();
	preview?.kill();
};
let preview;
try {
	await new Promise((r) => setTimeout(r, 500));
	execFileSync('npm', ['run', 'build'], { env, stdio: 'inherit' });
	preview = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { env, stdio: 'ignore' });
	for (let i = 0; ; i++) {
		try {
			if ((await fetch(BASE)).ok) break;
		} catch {}
		if (i > 100) throw new Error('preview did not start');
		await new Promise((r) => setTimeout(r, 200));
	}

	const browser = await chromium.launch();
	// The cookie banner dismissed (no consent given), so it does not cover the record.
	const quiet = (ctx) => ctx.addInitScript(() => localStorage.setItem('of-tomorrow-banner-dismissed', 'true'));
	const settle = async (page) => {
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(150);
	};

	for (const width of [1280, 390]) {
		const ctx = await browser.newContext({ viewport: { width, height: width > 600 ? 900 : 844 } });
		await quiet(ctx);
		const page = await ctx.newPage();
		// The homepage around the strip: the cover's foot, the strip, the top of Now building.
		await page.goto(`${BASE}/`);
		await settle(page);
		const box = await page.locator('#today').boundingBox();
		const pad = 72;
		await page.screenshot({
			path: `${OUT}/${PREFIX}-home-${width}.png`,
			fullPage: true,
			clip: { x: 0, y: Math.max(0, box.y - pad), width, height: box.height + 2 * pad },
		});
		console.log(`${OUT}/${PREFIX}-home-${width}.png`);
		if (CARD4) {
			// Reduced motion: the cards still, no arrows, the "more" link.
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.reload();
			await settle(page);
			const still = await page.locator('#today').boundingBox();
			await page.screenshot({
				path: `${OUT}/${PREFIX}-home-still-${width}.png`,
				fullPage: true,
				clip: { x: 0, y: Math.max(0, still.y - pad), width, height: still.height + 2 * pad },
			});
			console.log(`${OUT}/${PREFIX}-home-still-${width}.png`);
			await page.emulateMedia({ reducedMotion: 'no-preference' });
		}
		for (const [name, q] of [['today', ''], ['today-project', '?project=byollm']]) {
			await page.goto(`${BASE}/today${q}`);
			await settle(page);
			await page.screenshot({ path: `${OUT}/${PREFIX}-${name}-${width}.png`, fullPage: true });
			console.log(`${OUT}/${PREFIX}-${name}-${width}.png`);
		}
		await ctx.close();
	}

	// The walk.
	const size = { width: 1280, height: 800 };
	const dir = mkdtempSync(join(tmpdir(), 'today-walk-'));
	const context = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
	await quiet(context);
	const page = await context.newPage();
	const hold = (ms) => page.waitForTimeout(ms);
	await page.goto(`${BASE}/`);
	await settle(page);
	await hold(1200);
	// Down to the strip: three cards, picture left, hairlines between.
	await page.evaluate(() => window.scrollTo({ top: document.getElementById('today').offsetTop - 220, behavior: 'smooth' }));
	await hold(2600);
	const cards = page.locator('[data-testid="strip-card"] a');
	if (CARD4) {
		// The motion: two advances on their own, eight seconds apart.
		await page.mouse.move(640, 790);
		await hold(17_000);
		// Under the pointer it holds still past the eight seconds…
		await cards.nth(3).hover();
		await hold(10_000);
		// …and away from it, moves on.
		await page.mouse.move(640, 790);
		await hold(9_000);
		// The arrows, one card each way.
		await page.locator('[data-today-next]').click();
		await hold(1400);
		await page.locator('[data-today-prev]').click();
		await hold(1400);
	}
	for (let i = 0; i < 3; i++) {
		await cards.nth(i).hover();
		await hold(900);
	}
	if (CARD3) {
		// Every card's picture: the arrows, one card at a time, to the end and back to the start.
		const n = await cards.count();
		for (let i = 0; i < n - 3; i++) {
			await page.locator('[data-today-next]').click();
			await hold(1100);
		}
		await hold(800);
		for (let i = 0; i < n - 3; i++) {
			await page.locator('[data-today-prev]').click();
			await hold(350);
		}
		await hold(900);
	}
	// A card opens its story on /today.
	await cards.nth(0).click();
	await settle(page);
	await hold(2200);
	// /today filtered by project, then back to everything.
	await page.locator('[data-filter-value="press"]').click();
	await settle(page);
	await hold(2200);
	await page.locator('[data-filter-value="byollm"]').click();
	await settle(page);
	await hold(2200);
	await page.locator('[data-filter-key=""]').click();
	await settle(page);
	await hold(1600);
	await context.close();
	await browser.close();
	const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
	const mp4 = `${OUT}/${PREFIX}-walk.mp4`;
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', mp4]);
	rmSync(dir, { recursive: true, force: true });
	console.log(mp4);
} finally {
	kill();
}
