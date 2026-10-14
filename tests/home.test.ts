import { describe, test, expect, vi, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import Home from '../src/pages/index.astro';
import BlogIndex from '../src/pages/blog/index.astro';
import * as BlogPost from '../src/pages/blog/[...slug].astro';
import { DEPARTMENTS } from '../src/consts';
import { all, render, text } from './render';
import { magazineRule, theme } from './tokens';

// The home page and the blog's chrome, rendered to markup. How they look is
// the classes they carry and the tokens those classes resolve to
// (tests/tokens.ts); that nothing overflows a phone is tests/browser.spec.ts.

const home = () => render(Home);
const classes = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

describe('home: the magazine', () => {
	test('nameplate, issue line and nav', async () => {
		const doc = await home();
		const nameplate = doc.querySelector('[data-testid="nameplate"]')!;
		expect(text(nameplate)).toMatch(/^OF TOMORROW\s+INC\.$/i);
		expect(classes(nameplate)).toContain('font-display');
		expect(text(doc.querySelector('[data-testid="issue-line"]'))).toContain('Building the world of tomorrow, in public');
		const nav = doc.querySelector('nav[aria-label="Sections"]')!;
		expect(all(nav, 'a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
			['Now building', '/#now-building'],
			['From the workshop', '/#workshop'],
			['The company', '/#company'],
			['Write to us', '/#write'],
		]);
		for (const id of ['now-building', 'workshop', 'company', 'write']) expect(doc.getElementById(id), id).toBeTruthy();
	});

	test('cover story: headline and the two buttons', async () => {
		const doc = await home();
		expect(all(doc, 'h1').map(text)).toEqual(["A great big beautiful tomorrow doesn't arrive in your feed."]);
		const link = (name: string) => all(doc, 'a').find((a) => text(a) === name)!;
		expect(link('See BYOLLM →').getAttribute('href')).toBe('https://byo-llm.com');
		expect(link('Early access to the cloud').getAttribute('href')).toBe('https://byollm.cloud/early-access');
	});

	test('NOW BUILDING: the three links', async () => {
		const doc = await home();
		const cards = all(doc, '[data-testid="building-card"]');
		expect(cards.map((c) => c.querySelector('a')!.getAttribute('href'))).toEqual([
			'https://byo-llm.com',
			'https://byollm.cloud/early-access',
			'https://oftomorrow.press/#translations',
		]);
		expect(cards.map((c) => text(c.querySelector('h3')))).toEqual(['BYOLLM', 'BYOLLM Cloud', 'Translations Of Tomorrow']);
		expect(cards[2].querySelector('a')!.getAttribute('data-track-destination')).toBe('oftomorrow.press');
	});

	test('FROM THE WORKSHOP: the two newest posts from the feed', async () => {
		// tests/fixtures/workshop-feed.xml holds three, out of date order.
		const doc = await home();
		const cards = all(doc, '[data-testid="workshop-card"]');
		expect(cards.map((c) => [text(c.querySelector('h3')), c.querySelector('h3 a')!.getAttribute('href')])).toEqual([
			['The newest post & its ampersand', 'https://todd.oftomorrow.net/blog/the-newest-post/'],
			['The second post', 'https://todd.oftomorrow.net/blog/the-second-post/'],
		]);
		expect(doc.querySelector('[data-testid="all-posts"]')!.getAttribute('href')).toBe('https://todd.oftomorrow.net');
	});

	describe('FROM THE WORKSHOP, the feed unreachable', () => {
		afterEach(() => vi.resetModules());

		test('the two static fallback links', async () => {
			// The workshop module reads the feed once per build; a fresh one sees this fetch.
			vi.resetModules();
			const real = globalThis.fetch;
			vi.stubGlobal('fetch', (input: string, init?: RequestInit) =>
				String(input).startsWith('https://todd.oftomorrow.net') ? Promise.reject(new Error('offline')) : real(input, init),
			);
			try {
				const { latestWorkshopPosts, FALLBACK } = await import('../src/lib/workshop');
				expect(await latestWorkshopPosts(2)).toEqual(FALLBACK.slice(0, 2));
			} finally {
				vi.stubGlobal('fetch', real);
			}
		});
	});

	test('both illustrations, with captions, at the size the file is', async () => {
		const doc = await home();
		for (const [id, src, caption] of [
			['fig-1', '/images/art/cover-workbench.webp', 'Fig. 1 — A machine the size of a toaster, and the town it talks to.'],
			['fig-2', '/images/art/house-cutaway.webp', 'Fig. 2 — Every room has its own small machine. None of them phones home.'],
		] as const) {
			const fig = doc.querySelector(`[data-testid="${id}"]`)!;
			const img = fig.querySelector('img')!;
			expect(img.getAttribute('src')).toBe(src);
			const file = new URL(`../public${src}`, import.meta.url);
			expect(existsSync(file), src).toBe(true);
			const { width, height } = await sharp(file.pathname).metadata();
			expect([Number(img.getAttribute('width')), Number(img.getAttribute('height'))], src).toEqual([width, height]);
			expect(img.getAttribute('alt')).toBeTruthy();
			expect(text(fig.querySelector('figcaption'))).toBe(caption);
		}
		expect(doc.querySelector('[data-testid="fig-2"] img')!.getAttribute('loading')).toBe('lazy');
	});

	test("the mockup's copy, word for word", async () => {
		const doc = await home();
		const t = (id: string) => text(doc.querySelector(`[data-testid="${id}"]`));
		expect(t('deck')).toBe(
			"We have to build it. Small, single-purpose tools, well connected, running on the compute you already own – open source where it counts, and shown to you while it's being made.",
		);
		expect(t('building-tag')).toBe('Three things, all real');
		expect(all(doc, '[data-testid="building-card"] a').map(text)).toEqual([
			'Open source · 0.1.2 →',
			'Early access →',
			'Visit the site →',
		]);
		expect(t('write-line')).toBe('Building something, or want to? The door is open.');
		expect(t('footer-copyright')).toBe(`© ${new Date().getFullYear()} Of Tomorrow, Inc.`);
		expect(all(doc, '[data-testid="footer-links"] a').map(text)).toEqual(['byo-llm.com', 'byollm.cloud', 'todd.oftomorrow.net', 'Privacy']);
	});

	test('phone: 52px headline, 48px nameplate, full-width buttons and cards below sm', async () => {
		// Tailwind is mobile-first: the unprefixed class is the phone's.
		const doc = await home();
		expect(classes(doc.querySelector('h1'))).toEqual(expect.arrayContaining(['text-[52px]', 'sm:text-[68px]']));
		expect(classes(doc.querySelector('[data-testid="nameplate"]'))).toEqual(expect.arrayContaining(['text-[48px]', 'sm:text-[72px]']));
		for (const name of ['See BYOLLM →', 'Early access to the cloud']) {
			const a = all(doc, 'a').find((x) => text(x) === name)!;
			expect(classes(a), name).toEqual(expect.arrayContaining(['w-full', 'sm:w-auto']));
		}
		// The workshop cards are a one-column grid until md.
		const grid = doc.querySelector('[data-testid="workshop-card"]')!.parentElement!;
		expect(classes(grid)).toEqual(expect.arrayContaining(['grid-cols-1', 'md:grid-cols-2']));
		expect(classes(doc.querySelector('main > div'))).toContain('px-6');
	});
});

describe('home: the departments line', () => {
	test('the six names, in order, in the label face between ink rules, and nothing else', async () => {
		const doc = await home();
		const strip = doc.querySelector('#company [data-testid="departments"]')!;
		expect(strip).toBeTruthy();
		expect(all(strip, '[data-testid="department"]').map(text)).toEqual([...DEPARTMENTS]);
		expect([...DEPARTMENTS]).toEqual(['Software', 'Publishing', 'Games', 'Art', 'Events', 'Ventures']);
		expect(text(strip)).toBe(`Departments ${DEPARTMENTS.join(' · ')}`);
		expect(all(strip, 'a, img, svg')).toHaveLength(0);

		// The label face: .magazine .label is the display face, 700, uppercase.
		expect(classes(strip)).toEqual(
			expect.arrayContaining(['label', 'text-[15px]', '!tracking-[0.12em]', 'text-center', 'text-ink', 'border-y-2', 'border-ink']),
		);
		expect(magazineRule('.magazine .label')).toMatchObject({
			'font-family': 'var(--font-display)',
			'font-weight': '700',
			'text-transform': 'uppercase',
		});
		const label = all(strip, 'span').find((s) => text(s) === 'Departments')!;
		expect(classes(label)).toContain('text-teal');
		const dots = all(strip, '[aria-hidden="true"]');
		expect(dots).toHaveLength(DEPARTMENTS.length - 1);
		for (const d of dots) expect(classes(d)).toContain('text-poppy');
		expect(theme.colors).toMatchObject({ ink: '#1C1A16', teal: '#1F6E7A', poppy: '#C5372C' });
	});
});

describe('blog: same chrome', () => {
	test('index and launch post', async () => {
		const index = await render(BlogIndex);
		expect(index.querySelector('[data-testid="nameplate"]')).toBeTruthy();
		expect(all(index, 'a').find((a) => text(a) === 'todd.oftomorrow.net')!.getAttribute('href')).toBe('https://todd.oftomorrow.net');

		const path = (await BlogPost.getStaticPaths()).find((p) => p.params.slug === 'byollm-is-open-source')!;
		const post = await render(BlogPost.default, {
			params: path.params,
			props: path.props,
			request: new Request('https://oftomorrow.net/blog/byollm-is-open-source/'),
		});
		expect(text(post.querySelector('h1'))).toBe('BYOLLM is open source');
		expect(post.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://oftomorrow.net/blog/byollm-is-open-source/');
		expect(post.querySelector('article')).toBeTruthy();
		expect(classes(post.body)).toContain('magazine');
		expect(magazineRule('.magazine')['font-family']).toBe('var(--font-serif)');
		expect(post.querySelector('footer')).toBeTruthy();
	});
});
