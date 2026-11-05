// The walk (rule 26) of broadcast_001 card 2: one segment, driven from the dock —
// camera → lower-third → split with three reveals → full with the tile →
// framed → camera — recorded from broadcast/walk/stage.html (OBS's scenes, in a
// browser) and written to specs/assets/broadcast-001/walk.mp4. `npm run broadcast:walk`.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'specs/assets/broadcast-001/walk.mp4';
const size = { width: 2320, height: 1080 };
const dir = mkdtempSync(join(tmpdir(), 'bc-walk-'));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
const page = await context.newPage();
await page.goto(pathToFileURL(resolve('broadcast/walk/stage.html')).href);
await page.waitForLoadState('load');
await page.evaluate(() => document.fonts.ready);
const dock = page.frameLocator('#dock');
const hold = (ms) => page.waitForTimeout(ms);
const scene = async (name, label) => {
	await page.evaluate(([n, l]) => window.scene(n, l), [name, label]);
	await hold(300);
};
const type = async (sel, text) => {
	await dock.locator(sel).click();
	await dock.locator(sel).pressSequentially(text, { delay: 35 });
};

// 1. Camera, with the frame. The segment is set up in the dock while it runs.
await hold(1200);
await dock.locator('#issue').fill('12');
await dock.locator('#date').fill('2026-11-04');
await type('#title', 'Make it flow');
for (const l of ['Get your editor to simplify your points', 'You tell them what to write', 'Keep the text or the image full screen']) {
	await dock.locator('#add-line').click();
	await dock.locator('#lines input').last().pressSequentially(l, { delay: 20 });
}
await hold(600);

// 2. The lower-third: in along the bottom rule, hold, out.
await type('#lt', 'Todd Sampson');
await type('#lsub', 'Founder, Of Tomorrow');
await type('#ln', '7');
await dock.locator('#lower-in').click();
await hold(2600);
await dock.locator('#lower-out').click();
await hold(1000);

// 3. Split, then three reveals.
await scene('split', 'Split (300 ms fade)');
await hold(1200);
for (let i = 0; i < 3; i++) {
	await dock.locator('#reveal-plus').click();
	await hold(1300);
}

// 4. Full with the camera tile: the list stays put while the panel widens.
await scene('full', 'Full · list + tile (300 ms fade)');
await hold(2600);

// 5. Framed.
await scene('framed', 'Framed + tile (300 ms fade)');
await hold(2400);

// 6. Back to camera.
await scene('camera', 'Camera (300 ms fade)');
await hold(1800);

await context.close();
await browser.close();
const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', OUT]);
rmSync(dir, { recursive: true, force: true });
console.log(OUT);
