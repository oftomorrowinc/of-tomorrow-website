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
});
