import { describe, test, expect } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import * as script from '../scripts/today/picture.mjs';
import StoryCard from '../src/components/today/StoryCard.astro';
import { ACCENT, slugOf } from '../src/lib/today';
import { all, render } from './render';

// The pictures (specs/news_001.md §4, card 3): the prompt is the style's fixed
// half plus the story's picture: line, and the checks refuse a wrong size, text
// and a face; a refused picture is not written and the story keeps the
// monogram tile. The text and face passes are Apple Vision (detect.swift).

const DIR = 'src/content/today';
const FIX = 'tests/fixtures/today';
const stories = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const mac = process.platform === 'darwin';
// A plain .mjs script: its inferred types are narrower than the stand-ins the tests hand it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const picture: any = script;

describe('picture.mjs: the prompt', () => {
	test('a fixture story yields exactly the expected prompt', () => {
		const story = picture.readStory(readFileSync(`${DIR}/2026-11-04-tools-and-images-for-byollm.md`, 'utf8'));
		expect(picture.prompt(story)).toBe(
			'A small square magazine spot illustration, in the manner of an editorial newspaper or magazine spot drawing. ' +
				'Printed in two colours only on warm cream paper (#f4ecd9): near-black ink (#1c1a16) for line and solid areas, and deep teal (#1f6e7a) as the single spot colour. ' +
				'Shading is done with a coarse round halftone dot screen, like an old two-colour print; no gradients, no photographic texture, no other colours. ' +
				'Confident hand-inked outlines, simple flat shapes, generous empty paper around the subject. ' +
				'One object or one small scene, centred, seen plainly, nothing cropped at the edges.\n\n' +
				'Subject: a desk lamp shining on a small device that is handing a page to a larger machine.\n\n' +
				'Absolutely no text: no letters, words, numbers, labels, signage, captions, watermarks or signatures anywhere, even where the subject would normally carry writing; leave those surfaces blank. ' +
				"No people's faces and no real people. No logos or brand marks. Square, 1:1.",
		);
	});

	test('only the picture: line goes in, never the title or the body', () => {
		const file = readFileSync(`${DIR}/2026-11-04-the-weekly-gets-a-magazine.md`, 'utf8');
		const ask = picture.prompt(picture.readStory(file));
		expect(ask).not.toMatch(/weekly gets a magazine/i);
		expect(ask).not.toMatch(/OBS/);
	});

	test("the accent is the project's magazine token, the same map as the tile's", () => {
		expect(picture.ACCENT).toEqual(ACCENT);
		const t = picture.tokens();
		for (const [project, accent] of Object.entries(ACCENT)) expect(picture.prompt({ project, picture: 'a cup' })).toContain(t[accent]);
	});

	test('a story with no picture: line has no prompt', () => {
		expect(() => picture.prompt({ project: 'site' })).toThrow(/no picture: line/);
	});
});

describe.skipIf(!mac)('picture.mjs: the checks', () => {
	test('a wrong size is refused', async () => {
		expect(await picture.check(`${FIX}/wrong-size.webp`)).toEqual(['it is 512×512, not 480×480']);
	});

	test('too many bytes is refused', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'today-'));
		const noise = Buffer.alloc(480 * 480 * 3);
		for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
		await sharp(noise, { raw: { width: 480, height: 480, channels: 3 } }).webp({ quality: 100 }).toFile(`${dir}/heavy.webp`);
		const out = await picture.check(`${dir}/heavy.webp`);
		expect(out.some((m: string) => /KB, over 60 KB/.test(m))).toBe(true);
	});

	test('an image with text is refused', async () => {
		expect(await picture.check(`${FIX}/text.webp`)).toEqual(['text was read in it: "OPEN"']);
	});

	test('an image with a face is refused', async () => {
		expect(await picture.check(`${FIX}/face.webp`)).toEqual(['1 face was found in it']);
	});

	test('every committed picture is one a story names, and passes every check', async () => {
		const images = readdirSync(`${DIR}/images`).filter((f) => f.endsWith('.webp'));
		const named = stories.map((f) => readFileSync(`${DIR}/${f}`, 'utf8').match(/^image: \.\/images\/(.+)$/m)?.[1]).filter(Boolean);
		expect(images.sort()).toEqual([...named].sort());
		for (const f of images) expect(await picture.check(`${DIR}/images/${f}`), f).toEqual([]);
	}, 60_000);
});

describe.skipIf(!mac)('picture.mjs: written or refused', () => {
	const story = '2026-11-04-the-weekly-gets-a-magazine.md';
	const bare = () => {
		const dir = mkdtempSync(join(tmpdir(), 'today-'));
		const file = join(dir, story);
		// The story as it was before it had a picture.
		writeFileSync(file, readFileSync(`${DIR}/${story}`, 'utf8').replace(/^image:.*\n/m, ''));
		return { dir, file };
	};
	const quiet = { log: () => {}, error: () => {} };

	test('a refused picture is not written and the story is left without an image', async () => {
		const { dir, file } = bare();
		const before = readFileSync(file, 'utf8');
		const code = await picture.run(file, { make: async () => readFileSync(`${FIX}/face.webp`), log: quiet });
		expect(code).toBe(1);
		expect(existsSync(join(dir, 'images', `${slugOf(story)}.webp`))).toBe(false);
		expect(readFileSync(file, 'utf8')).toBe(before);
	});

	test('a passing picture is written at 480×480 and the story points at it', async () => {
		const { dir, file } = bare();
		const src = `${dir}/src.png`;
		copyFileSync(`${DIR}/images/${slugOf(story)}.webp`, src);
		const code = await picture.run(file, { make: async () => sharp(src).resize(1024, 1024).png().toBuffer(), log: quiet });
		expect(code).toBe(0);
		const out = join(dir, 'images', `${slugOf(story)}.webp`);
		expect(await sharp(out).metadata()).toMatchObject({ format: 'webp', width: 480, height: 480 });
		expect(readFileSync(file, 'utf8')).toMatch(/^picture: .+\nimage: \.\/images\/the-weekly-gets-a-magazine\.webp$/m);
	});
});

describe('the fallback renders', () => {
	test('a story with no image shows the monogram tile in its accent; one with an image shows the picture', async () => {
		const data = { date: new Date('2026-11-04T00:00:00Z'), title: 'A refused picture', body: 'It had a face. So it shows the tile.', project: 'press', author: 'cw', picture: 'a cup' };
		const without = await render(StoryCard, { props: { as: 'strip', story: { id: '2026-11-04-a-refused-picture', data } } });
		const tile = without.querySelector('[data-testid="monogram"]')!;
		expect(tile.getAttribute('data-accent')).toBe('poppy');
		expect(without.querySelector('[data-testid="picture"]')).toBeNull();

		const image = { src: '/_astro/x.webp', width: 480, height: 480, format: 'webp' };
		const withImage = await render(StoryCard, { props: { as: 'strip', story: { id: '2026-11-04-a-picture', data: { ...data, image } } } });
		expect(all(withImage, '[data-testid="picture"]').length).toBe(1);
		expect(withImage.querySelector('[data-testid="monogram"]')).toBeNull();
	});
});
