#!/usr/bin/env node
// A story's picture (specs/news_001.md §4, card 3).
//
//   node scripts/today/picture.mjs src/content/today/<yyyy-mm-dd>-<slug>.md [--prompt]
//
// Builds the prompt from scripts/today/style.md (the fixed half) and the
// story's `picture:` line, asks the image generator Press's Ad Studio uses
// (Google's Gemini image model through generateContent, the call in
// of-tomorrow-press apps/ad-studio/src/lib/images/google.ts), makes the answer
// a 480×480 WebP of at most 60 KB, and runs the checks: the size, a text pass
// (any word read in it fails) and a face pass (any face found fails). A picture
// that passes is written to src/content/today/images/<slug>.webp and the story
// gets `image: ./images/<slug>.webp`; one that fails is not written, the
// story is left as it was, and with no image it shows the monogram tile.
// Exit 0 written, 1 refused by a check, 2 could not run. `--prompt` prints the
// prompt and stops (no key, no call).
//
// The key: Ad Studio's, never in this repo. AD_STUDIO_ART_KEY (Ad Studio's own
// name) or GEMINI_API_KEY from the environment, else from of-tomorrow-press's
// .env.local (TODAY_ART_ENV names another file). AD_STUDIO_ART_MODEL swaps the
// model as it does in Ad Studio. The key goes in a header, never a URL, and is
// never printed.
//
// When byollm 0.1.5's `llm.image` ships, the generator becomes a byollm
// service and this script its first consumer: generate() below is the one
// function that changes. Not built now (card 3's brief).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

export const SIZE = 480;
export const MAX_BYTES = 60 * 1024;
export const MODEL = 'gemini-3.1-flash-image';

// The project's accent (ACCENT in src/lib/today.ts; tests/picture.test.ts keeps
// the two equal) and how the prompt says it. The colours are the magazine's
// tokens, read from src/styles/magazine.css, so the picture and the page agree.
export const ACCENT = { byollm: 'teal', press: 'poppy', signals: 'mustard', site: 'ink', studio: 'body-muted' };
const SAY = {
	teal: (hex) => `deep teal (${hex})`,
	poppy: (hex) => `poppy red (${hex})`,
	mustard: (hex) => `mustard yellow (${hex})`,
	// The house's accent is ink itself: the spot colour is a light halftone tint of the same ink.
	ink: (hex) => `a light halftone tint of the same ink (${hex})`,
	'body-muted': (hex) => `warm umber grey (${hex})`,
};

export function tokens(css = readFileSync(join(ROOT, 'src/styles/magazine.css'), 'utf8')) {
	const out = {};
	for (const name of ['paper', 'ink', ...Object.values(ACCENT)]) {
		const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
		if (!m) throw new Error(`magazine.css has no --${name}`);
		out[name] = m[1].toLowerCase();
	}
	return out;
}

/** The fixed half: the ```prompt block of style.md. */
export function style(md = readFileSync(join(HERE, 'style.md'), 'utf8')) {
	const m = md.match(/```prompt\n([\s\S]*?)\n```/);
	if (!m) throw new Error('scripts/today/style.md has no ```prompt block');
	return m[1];
}

/** The story's frontmatter fields picture.mjs reads, by line (the files are flat YAML). */
export function readStory(text) {
	const fm = text.match(/^---\n([\s\S]*?)\n---/);
	if (!fm) throw new Error('no frontmatter');
	const field = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
	return { project: field('project'), picture: field('picture'), image: field('image') };
}

/** style.md's fixed half, the subject and the accent filled in; paragraphs joined to single lines. */
export function prompt(story, md, css) {
	if (!story.picture) throw new Error('the story has no picture: line');
	const accent = ACCENT[story.project];
	if (!accent) throw new Error(`unknown project "${story.project}"`);
	const t = tokens(css);
	const subject = story.picture.trim().replace(/\.$/, '');
	return style(md)
		.replaceAll('{paper}', t.paper)
		.replaceAll('{ink}', t.ink)
		.replaceAll('{accent}', SAY[accent](t[accent]))
		.replaceAll('{subject}', subject)
		.split(/\n{2,}/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.join('\n\n');
}

// ---- the generator ------------------------------------------------------

function keyFrom(env = process.env) {
	const direct = env.AD_STUDIO_ART_KEY?.trim() || env.GEMINI_API_KEY?.trim();
	if (direct) return direct;
	const press = join(homedir(), 'Github/of-tomorrow-press');
	const files = env.TODAY_ART_ENV ? [env.TODAY_ART_ENV] : [join(press, 'apps/ad-studio/.env.local'), join(press, '.env.local')];
	for (const f of files) {
		if (!existsSync(f)) continue;
		for (const name of ['AD_STUDIO_ART_KEY', 'GEMINI_API_KEY']) {
			const m = readFileSync(f, 'utf8').match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm'));
			if (m) return m[1].trim();
		}
	}
	throw new Error('no image key: set AD_STUDIO_ART_KEY (Ad Studio\'s), or keep it in of-tomorrow-press/.env.local, or point TODAY_ART_ENV at the file');
}

/** Ad Studio's call (google.ts), asked for a square image. Returns PNG or JPEG bytes. */
export async function generate(text, { env = process.env, fetcher = fetch } = {}) {
	const model = env.AD_STUDIO_ART_MODEL?.trim() || MODEL;
	const res = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keyFrom(env) },
		body: JSON.stringify({
			contents: [{ role: 'user', parts: [{ text }] }],
			generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
		}),
	});
	const body = await res.text();
	if (!res.ok) {
		let message = body.slice(0, 300);
		try {
			message = JSON.parse(body).error?.message ?? message;
		} catch {}
		throw new Error(`Google answered ${res.status}: ${message}`);
	}
	const json = JSON.parse(body);
	for (const c of json.candidates ?? [])
		for (const p of c.content?.parts ?? []) {
			const blob = p.inlineData ?? (p.inline_data && { mimeType: p.inline_data.mime_type, data: p.inline_data.data });
			if (blob?.data) return new Uint8Array(Buffer.from(blob.data, 'base64'));
		}
	const blocked = json.promptFeedback?.blockReason;
	throw new Error(blocked ? `Google declined the prompt (${blocked})` : 'Google answered with no image');
}

// ---- the picture --------------------------------------------------------

/** 480×480 WebP at most 60 KB: centre-cropped square, quality stepped down until it fits. */
export async function encode(bytes) {
	const square = sharp(bytes).resize(SIZE, SIZE, { fit: 'cover' });
	for (const quality of [82, 76, 70, 64, 58, 52, 46, 40]) {
		const out = await square.clone().webp({ quality, effort: 6 }).toBuffer();
		if (out.length <= MAX_BYTES) return out;
	}
	return square.webp({ quality: 34, effort: 6 }).toBuffer();
}

// The Vision detector (detect.swift), compiled once per source into node_modules/.cache.
function detector() {
	if (process.platform !== 'darwin') throw new Error('the text and face passes use Apple Vision (scripts/today/detect.swift); run on a Mac');
	const src = join(HERE, 'detect.swift');
	const hash = createHash('sha256').update(readFileSync(src)).digest('hex').slice(0, 12);
	const bin = join(ROOT, 'node_modules/.cache/today', `detect-${hash}`);
	if (!existsSync(bin)) {
		mkdirSync(dirname(bin), { recursive: true });
		execFileSync('swiftc', ['-O', src, '-o', bin], { stdio: ['ignore', 'ignore', 'inherit'] });
	}
	return bin;
}

/** What Vision saw in each file: { words: [{ text, confidence }], faces }. */
export function look(paths) {
	const lines = execFileSync(detector(), paths, { encoding: 'utf8' }).trim().split('\n');
	return lines.map((l) => {
		const seen = JSON.parse(l);
		if (seen.error) throw new Error(`Vision could not read ${seen.path}: ${seen.error}`);
		return seen;
	});
}

// A "word": two or more letters or digits together. A lone glyph Vision reads
// out of a halftone dot or a hairline is not text a reader would read.
const WORD = /[\p{L}\p{N}]{2,}/u;

/**
 * The checks (§4): every reason the picture at `path` may not be used; empty
 * when it may. Size and bytes from the file; text and faces from Vision.
 */
export async function check(path) {
	const out = [];
	const meta = await sharp(path).metadata();
	if (meta.format !== 'webp') out.push(`it is ${meta.format}, not WebP`);
	if (meta.width !== SIZE || meta.height !== SIZE) out.push(`it is ${meta.width}×${meta.height}, not ${SIZE}×${SIZE}`);
	const bytes = readFileSync(path).length;
	if (bytes > MAX_BYTES) out.push(`it is ${Math.ceil(bytes / 1024)} KB, over ${MAX_BYTES / 1024} KB`);
	const [seen] = look([path]);
	const words = seen.words.filter((w) => WORD.test(w.text));
	if (words.length) out.push(`text was read in it: ${words.map((w) => JSON.stringify(w.text)).join(', ')}`);
	if (seen.faces) out.push(`${seen.faces} face${seen.faces > 1 ? 's were' : ' was'} found in it`);
	return out;
}

/** Add or replace the story's image: line, after picture: (or at the end of the frontmatter). */
export function withImage(text, image) {
	const fm = text.match(/^---\n([\s\S]*?)\n---/);
	let lines = fm[1].split('\n').filter((l) => !/^image:/.test(l));
	const at = lines.findIndex((l) => /^picture:/.test(l));
	lines.splice(at >= 0 ? at + 1 : lines.length, 0, `image: ${image}`);
	return text.replace(fm[0], `---\n${lines.join('\n')}\n---`);
}

/**
 * One story's picture, start to finish. `make` is the generator (generate(),
 * or a stand-in in the tests); `log` gets what a person running it reads.
 * Returns 0 written, 1 refused by a check.
 */
export async function run(file, { make = generate, log = console } = {}) {
	const text = readFileSync(file, 'utf8');
	const story = readStory(text);
	const slug = basename(file).replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
	const dir = join(dirname(file), 'images');
	const final = join(dir, `${slug}.webp`);
	const draft = join(ROOT, 'node_modules/.cache/today', `${slug}.webp`);
	mkdirSync(dirname(draft), { recursive: true });

	writeFileSync(draft, await encode(await make(prompt(story))));
	const failed = await check(draft);
	if (failed.length) {
		log.error(`${slug}: not written, ${failed.join('; ')}. ${story.image ? 'The story keeps its picture.' : 'The story shows the monogram tile.'}`);
		log.error(`(the refused draft is at ${draft})`);
		return 1;
	}
	mkdirSync(dir, { recursive: true });
	writeFileSync(final, readFileSync(draft));
	writeFileSync(file, withImage(text, `./images/${slug}.webp`));
	log.log(`${final} ${readFileSync(final).length} bytes, checks passed`);
	return 0;
}

async function main(argv) {
	const file = argv.find((a) => !a.startsWith('--'));
	if (!file) {
		console.error('usage: node scripts/today/picture.mjs <story-file> [--prompt]');
		return 2;
	}
	if (argv.includes('--prompt')) {
		console.log(prompt(readStory(readFileSync(file, 'utf8'))));
		return 0;
	}
	return run(file);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main(process.argv.slice(2)).then(
		(code) => process.exit(code),
		(e) => {
			console.error(e.message);
			process.exit(2);
		},
	);
}
