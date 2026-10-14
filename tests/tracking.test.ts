import { describe, test, expect } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import Home from '../src/pages/index.astro';
import { isTranslationsLink } from '../src/utils/tracking';
import { html } from './render';

// visit_translation_site: Translations Of Tomorrow's home is
// oftomorrow.press/#translations, and the old host 301s there, so either counts.
const CASES: [string, boolean][] = [
	['https://oftomorrow.press/#translations', true],
	['https://www.oftomorrow.press/#translations', true],
	['https://translations.oftomorrow.net', true],
	['https://translations.oftomorrow.net/some/page', true],
	['https://oftomorrow.press/', false],
	['https://oftomorrow.press/#workshop', false],
	['https://byo-llm.com', false],
	['https://example.com/?u=translations.oftomorrow.net', false],
	['not a url', false],
];

/** The home page with its inline scripts run (jsdom: no network, no layout),
 *  so window.tracker is the one the build ships. The React island (the consent
 *  banner) is left out: it hydrates by dynamic import, which jsdom cannot. */
async function shipped() {
	const page = new JSDOM(await html(Home)).window.document;
	for (const el of page.querySelectorAll('astro-island, script')) {
		if (el.tagName === 'ASTRO-ISLAND' || /astro-island|\bimport\(/.test(el.textContent ?? '')) el.remove();
	}
	const errors: string[] = [];
	const virtualConsole = new VirtualConsole();
	virtualConsole.on('jsdomError', (e) => errors.push(e.message));
	const { window } = new JSDOM(page.documentElement.outerHTML, { url: 'https://oftomorrow.net/', runScripts: 'dangerously', virtualConsole });
	expect(errors).toEqual([]);
	return window as unknown as Window & { tracker: any };
}

describe('tracking: the translations predicate', () => {
	test('src/utils/tracking.ts', () => {
		for (const [url, want] of CASES) expect(isTranslationsLink(url), url).toBe(want);
	});

	test('the inline tracker the build ships', async () => {
		const { tracker } = await shipped();
		expect(CASES.map(([url]) => tracker.isTranslationsLink(url))).toEqual(CASES.map(([, want]) => want));
	});

	test('trackExternalLink fires visit_translation_site for either URL', async () => {
		const { tracker } = await shipped();
		const fired: string[] = [];
		tracker.trackEvent = (name: string) => fired.push(name);
		for (const u of ['https://oftomorrow.press/#translations', 'https://translations.oftomorrow.net', 'https://byo-llm.com']) {
			tracker.trackExternalLink(u, 'Visit the site');
		}
		expect(fired.filter((e) => e === 'visit_translation_site')).toHaveLength(2);
	});

	test("a click on the Translations card's link is that call, with its href", async () => {
		const window = await shipped();
		const calls: string[] = [];
		window.tracker.trackExternalLink = (url: string) => calls.push(url);
		const link = window.document.querySelector<HTMLAnchorElement>('[data-track-destination="oftomorrow.press"]')!;
		link.addEventListener('click', (e) => e.preventDefault());
		link.click();
		expect(calls).toEqual(['https://oftomorrow.press/#translations']);
	});
});
