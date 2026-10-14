// The design tokens a class resolves to, read from where they are declared:
// tailwind.config.mjs (the classes) and src/styles/magazine.css (the custom
// properties and the .magazine rules). A test that checks a class checks the
// token here, so a colour or a face changed in either place turns it red.
import { readFileSync } from 'node:fs';
import config from '../tailwind.config.mjs';

export const theme = config.theme!.extend as {
	colors: Record<string, string>;
	fontFamily: Record<string, string[]>;
};

export const MAGAZINE_CSS = readFileSync(new URL('../src/styles/magazine.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule with exactly this selector. */
export function magazineRule(selector: string): Record<string, string> {
	const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const m = MAGAZINE_CSS.match(new RegExp(`(?:^|})\\s*${esc}\\s*\\{([^}]*)\\}`));
	if (!m) throw new Error(`no rule '${selector}' in magazine.css`);
	return Object.fromEntries(
		m[1]
			.split(';')
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]),
	);
}

/** A custom property from :root, followed to its value. */
export const cssVar = (name: string): string => magazineRule(':root')[`--${name}`];
