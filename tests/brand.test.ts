import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import BrandTest from '../src/pages/brand-test.astro';
import { all, render, text } from './render';
import { cssVar, magazineRule, theme } from './tokens';

// The brand: two faces and the magazine's colours, as classes on the markup
// and the tokens behind them (tests/tokens.ts).

const classes = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

describe('brand', () => {
	test('brand configuration displays correctly', async () => {
		const doc = await render(BrandTest);
		expect(text(doc.querySelector('title'))).toBe('Brand Test - Of Tomorrow, Inc.');

		// The nameplate face and the reading face.
		expect(classes(doc.querySelector('h1'))).toContain('font-display');
		expect(theme.fontFamily.display[0]).toBe('"Big Shoulders Display"');
		expect(cssVar('font-display')).toMatch(/^'Big Shoulders Display'/);
		expect(classes(doc.body)).toContain('magazine');
		expect(magazineRule('.magazine')['font-family']).toBe('var(--font-serif)');
		expect(cssVar('font-serif')).toMatch(/^'Source Serif 4'/);

		// Poppy is the primary action; the ground is paper.
		const primary = all(doc, 'button').find((b) => text(b) === 'Primary Action')!;
		expect(classes(primary)).toContain('bg-poppy');
		expect(theme.colors.poppy).toBe('#C5372C');
		expect(magazineRule('.magazine').background).toBe('var(--paper)');
		expect(cssVar('paper').toUpperCase()).toBe('#F4ECD9');
	});

	test('the two faces are loaded, and Tailwind and the custom properties agree on every colour', async () => {
		const fonts = readFileSync(new URL('../src/components/Fonts.astro', import.meta.url), 'utf8');
		expect(fonts).toContain('family=Big+Shoulders+Display');
		expect(fonts).toContain('family=Source+Serif+4');
		for (const name of ['paper', 'paper-light', 'paper-dark', 'ink', 'poppy', 'teal', 'mustard', 'body-muted', 'caption']) {
			expect(cssVar(name).toUpperCase(), name).toBe(theme.colors[name].toUpperCase());
		}
	});

	test('no Space Grotesk or Inter anywhere the CSS is made from', () => {
		// The built CSS is Tailwind over these, plus the .css files they import.
		const files = ['tailwind.config.mjs'];
		const walk = (dir: string) => {
			for (const f of readdirSync(dir)) {
				const p = join(dir, f);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.(astro|css|tsx?|jsx?|mjs)$/.test(f)) files.push(p);
			}
		};
		walk('src');
		expect(files.length).toBeGreaterThan(10);
		for (const f of files) {
			const src = readFileSync(f, 'utf8');
			expect(src, f).not.toMatch(/Space Grotesk/);
			expect(src, f).not.toMatch(/(["',\s:])Inter(["',;])/);
		}
		for (const faces of Object.values(theme.fontFamily)) expect(faces.join(',')).not.toMatch(/Space Grotesk|\bInter\b/);
	});

	test('contrast: body-muted on paper and paper on teal are at least 4.5:1', () => {
		const lum = (hex: string) => {
			const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
			const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
			return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
		};
		const ratio = (a: string, b: string) => {
			const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
			return (hi + 0.05) / (lo + 0.05);
		};
		// From the tokens, so a changed colour is re-measured.
		const c = theme.colors;
		const pairs: [string, string, string][] = [
			['body-muted on paper', c['body-muted'], c.paper],
			['paper on teal', c.paper, c.teal],
			['teal on paper (eyebrows, captions)', c.teal, c.paper],
			['poppy on paper (issue line)', c.poppy, c.paper],
			['paper-light on poppy (button)', c['paper-light'], c.poppy],
			['mustard on ink (numerals)', c.mustard, c.ink],
		];
		for (const [name, fg, bg] of pairs) expect(ratio(fg, bg), name).toBeGreaterThanOrEqual(4.5);
	});

	test('broadcast/ (the OBS pages): every token it uses resolves to magazine.css, and it has no colour or face of its own', () => {
		// specs/broadcast_001.md §1: "a token changed in magazine.css turns a
		// broadcast page's test red the same day" — so the pages may only alias
		// magazine.css's :root, never restate a value.
		const root = magazineRule(':root');
		const files = readdirSync('broadcast')
			.filter((f) => /\.(css|html|js)$/.test(f))
			.map((f) => join('broadcast', f));
		files.push(...readdirSync('broadcast/fonts').filter((f) => f.endsWith('.css')).map((f) => join('broadcast/fonts', f)));
		expect(files.length).toBeGreaterThanOrEqual(8);
		const src = Object.fromEntries(files.map((f) => [f, readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')]));

		// broadcast/'s own custom properties (--ground, --accent, …), every declaration of each.
		const local: Record<string, string[]> = {};
		for (const text of Object.values(src))
			for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) (local[m[1].slice(2)] ??= []).push(m[2].trim());

		const resolves = (name: string, seen: string[] = []): string | null => {
			if (`--${name}` in root) return null;
			if (!(name in local)) return `--${name} is in neither magazine.css's :root nor broadcast/`;
			if (seen.includes(name)) return `--${name} is circular`;
			for (const value of local[name]) {
				const refs = [...value.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]);
				// A local value with no reference may be motion (an easing), never a colour or a face.
				if (!refs.length && /#|rgb|hsl|serif|sans|display/i.test(value)) return `--${name}: ${value} restates a value`;
				for (const r of refs) {
					const bad = resolves(r, [...seen, name]);
					if (bad) return bad;
				}
			}
			return null;
		};

		const used = new Set<string>();
		for (const [f, text] of Object.entries(src)) {
			for (const m of text.matchAll(/var\(--([\w-]+)\)/g)) used.add(m[1]);
			// No colour literal anywhere in the pages, their CSS or their scripts.
			expect(text.match(/#[0-9a-f]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?)\(/gi), f).toBeNull();
			// Faces only through magazine.css's --font-display / --font-serif.
			for (const m of text.matchAll(/font-family\s*:\s*([^;}\n]+)/g)) {
				if (f.endsWith('fonts.css')) continue;
				expect(m[1].trim(), `${f}: font-family`).toMatch(/^(var\(--font-(display|serif)\)|ui-monospace, Menlo, monospace)$/);
			}
		}
		expect(used.size).toBeGreaterThan(10);
		for (const name of used) expect(resolves(name), name).toBeNull();
		// And the tokens they reach are the brand's: the colours and faces checked above.
		for (const t of ['paper', 'paper-dark', 'ink', 'poppy', 'teal', 'mustard', 'caption', 'font-display', 'font-serif']) expect(used, t).toContain(t);

		// fonts.css declares the two faces magazine.css names, and no others.
		const faces = [...src['broadcast/fonts/fonts.css'].matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]);
		expect(new Set(faces)).toEqual(new Set([cssVar('font-display'), cssVar('font-serif')].map((v) => v.match(/^'([^']+)'/)![1])));

		// Every page takes magazine.css itself, before its own CSS.
		for (const f of files.filter((f) => f.endsWith('.html'))) {
			const links = [...src[f].matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
			expect(links, f).toEqual(['fonts/fonts.css', '../src/styles/magazine.css', 'broadcast.css']);
		}
	});
});
