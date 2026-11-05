// The stinger (specs/broadcast_001.md §2.6, §5 card 3): broadcast/stinger.html
// stepped through its 700 ms at 60 fps in Playwright, each frame screenshotted
// over transparency, encoded by ffmpeg to broadcast/obs/stinger.webm (VP9 with
// an alpha channel, the paper-turn as its Opus audio track, which is the audio
// OBS's stinger plays) — and the paper-turn alone as broadcast/obs/stinger.ogg.
// `npm run broadcast:stinger`. Needs ffmpeg with libvpx-vp9 and libopus.
//
// Deterministic: the page is a pure function of t, the sound comes from a seeded
// generator, and ffmpeg runs single-threaded with +bitexact (no version string,
// no random Ogg serial or Matroska UIDs) — the same inputs make the same bytes.
// `node broadcast/stinger.mjs --check` renders into a temp dir and compares.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const FPS = 60;
const DURATION = 700; // ms
const FRAMES = Math.round((DURATION / 1000) * FPS); // 42
const RATE = 48000;

/** The paper-turn: 700 ms, synthesised. A swish of band-passed noise whose
 *  centre rises as the sheet crosses (loudest at the 350 ms cut), a soft low
 *  flap at the cut, and a scatter of paper crackles. Seeded, so the same samples
 *  every time. Returns mono 16-bit PCM. */
export function paperTurn() {
	const n = Math.round((RATE * DURATION) / 1000);
	let seed = 0x0f70_2026;
	const rand = () => {
		// mulberry32
		seed = (seed + 0x6d2b79f5) | 0;
		let t = seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const out = new Float64Array(n);
	// A band-pass biquad (RBJ), re-tuned per sample for the sweep.
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	let l1 = 0; // one-pole low-pass state, for the flap
	const crackles = Array.from({ length: 16 }, () => ({ at: 0.12 + 0.62 * rand(), amp: 0.25 + 0.5 * rand(), len: 0.002 + 0.004 * rand() }));
	for (let i = 0; i < n; i++) {
		const t = i / RATE; // s
		const u = t / (DURATION / 1000);
		const white = rand() * 2 - 1;
		// swish
		const f0 = 1400 + 3200 * u;
		const q = 0.9;
		const w = (2 * Math.PI * f0) / RATE;
		const alpha = Math.sin(w) / (2 * q);
		const a0 = 1 + alpha;
		const y = (alpha * white - alpha * x2 + 2 * Math.cos(w) * y1 - (1 - alpha) * y2) / a0;
		x2 = x1; x1 = white; y2 = y1; y1 = y;
		const env = Math.sin(Math.PI * u) ** 1.6;
		let s = 0.55 * y * env;
		// flap: low-passed noise, a short bump around the cut
		l1 += 0.04 * (white - l1);
		const d = (t - 0.35) / 0.045;
		s += 1.6 * l1 * Math.exp(-d * d);
		// crackles
		for (const c of crackles) {
			const dt = t - c.at;
			if (dt >= 0 && dt < c.len * 4) s += c.amp * white * Math.exp(-dt / c.len) * env;
		}
		out[i] = s;
	}
	// fade the last 20 ms to silence, normalise to −3 dBFS
	const fade = Math.round(RATE * 0.02);
	for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
	let peak = 0;
	for (const v of out) peak = Math.max(peak, Math.abs(v));
	const gain = 0.708 / peak;
	const pcm = Buffer.alloc(n * 2);
	for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), i * 2);
	return pcm;
}

function wav(pcm) {
	const h = Buffer.alloc(44);
	h.write('RIFF', 0);
	h.writeUInt32LE(36 + pcm.length, 4);
	h.write('WAVEfmt ', 8);
	h.writeUInt32LE(16, 16);
	h.writeUInt16LE(1, 20); // PCM
	h.writeUInt16LE(1, 22); // mono
	h.writeUInt32LE(RATE, 24);
	h.writeUInt32LE(RATE * 2, 28);
	h.writeUInt16LE(2, 32);
	h.writeUInt16LE(16, 34);
	h.write('data', 36);
	h.writeUInt32LE(pcm.length, 40);
	return Buffer.concat([h, pcm]);
}

const BITEXACT = ['-fflags', '+bitexact', '-flags', '+bitexact', '-map_metadata', '-1', '-threads', '1'];
const OPUS = ['-c:a', 'libopus', '-b:a', '96k', '-flags:a', '+bitexact'];

export async function render(outDir) {
	mkdirSync(outDir, { recursive: true });
	const work = mkdtempSync(join(tmpdir(), 'bc-stinger-'));
	try {
		const browser = await chromium.launch();
		const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
		await page.goto(`${pathToFileURL(resolve('broadcast/stinger.html')).href}?play=0`);
		await page.evaluate(() => window.stinger.ready);
		// Frame 0 is the first instant (nothing on screen) and the last frame is
		// the end (everything gone), so the file opens and closes on the scene.
		for (let i = 0; i < FRAMES; i++) {
			const t = (i * DURATION) / (FRAMES - 1);
			await page.evaluate((t) => window.stinger(t), t);
			await page.screenshot({ path: join(work, `f${String(i).padStart(3, '0')}.png`), omitBackground: true });
		}
		await browser.close();

		const sound = join(work, 'paper-turn.wav');
		writeFileSync(sound, wav(paperTurn()));
		const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
		ff(['-i', sound, ...OPUS, ...BITEXACT, join(outDir, 'stinger.ogg')]);
		ff([
			'-framerate', String(FPS), '-i', join(work, 'f%03d.png'), '-i', sound,
			'-map', '0:v', '-map', '1:a',
			// yuva420p: VP9's alpha; auto-alt-ref off (libvpx can't with alpha); row-mt off for one path through the encoder
			'-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '28', '-b:v', '0', '-deadline', 'good', '-cpu-used', '1', '-row-mt', '0', '-auto-alt-ref', '0',
			...OPUS, ...BITEXACT, join(outDir, 'stinger.webm'),
		]);
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
	return ['stinger.webm', 'stinger.ogg'].map((f) => join(outDir, f));
}

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	if (process.argv.includes('--check')) {
		// Render twice into temp dirs and against the committed files.
		const a = await render(mkdtempSync(join(tmpdir(), 'bc-st-a-')));
		const b = await render(mkdtempSync(join(tmpdir(), 'bc-st-b-')));
		let same = true;
		for (const [i, f] of ['stinger.webm', 'stinger.ogg'].entries()) {
			const committed = join('broadcast/obs', f);
			const hs = [sha(a[i]), sha(b[i]), sha(committed)];
			const ok = hs.every((h) => h === hs[0]);
			same &&= ok;
			console.log(`${ok ? 'same' : 'DIFFERENT'}  ${f}  run1 ${hs[0].slice(0, 12)}  run2 ${hs[1].slice(0, 12)}  committed ${hs[2].slice(0, 12)}`);
		}
		process.exit(same ? 0 : 1);
	}
	for (const f of await render('broadcast/obs')) console.log(f, sha(f).slice(0, 12));
}
