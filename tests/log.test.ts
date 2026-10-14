import { describe, test, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import LogIndex from '../src/pages/log/index.astro';
import * as LogSlug from '../src/pages/log/[slug].astro';
import * as LogRss from '../src/pages/log/rss.xml';
import * as LogSlugRss from '../src/pages/log/[slug]/rss.xml';
import Home from '../src/pages/index.astro';
import { queryUrl } from '../src/lib/log';
import { fixture } from './fixtures/log-feed.mjs';
import { all, render, text } from './render';

// The build log (/log, /log/<person>, /log/<project>, the homepage strip, the
// RSS), rendered from tests/fixtures/log-feed.json (tests/setup.ts answers the
// build's fetch). What happens after load — the live line, entries newer than
// the build — is the browser's (tests/browser.spec.ts).

const SITE = new URL('https://oftomorrow.net');

const seqs = (scope?: string, person?: string): number[] =>
	fixture.entries
		.filter((e: any) => !scope || e.scope === scope)
		.filter((e: any) => !person || e.people.includes(person))
		.map((e: any) => e.seq);
const newestFirst = (xs: number[]) => [...xs].sort((a, b) => b - a);
const seqOf = (els: Element[]) => els.map((el) => Number(el.getAttribute('data-seq')));

const log = () => render(LogIndex);

/** /log/<slug> the way the build makes it: from its getStaticPaths. */
async function slugPage(slug: string): Promise<Document> {
	const path = (await LogSlug.getStaticPaths()).find((p) => p.params.slug === slug);
	expect(path, `getStaticPaths has /log/${slug}`).toBeTruthy();
	return render(LogSlug.default, { params: path!.params, props: path!.props });
}

describe('/log: everything', () => {
	test('every entry, newest first, grouped by New York day, as prose', async () => {
		const doc = await log();
		expect(text(doc.querySelector('[data-testid="log-heading"]'))).toBe('Everything');
		const entries = all(doc, '[data-testid="log-entry"]');
		expect(entries).toHaveLength(fixture.entries.length);
		expect(seqOf(entries)).toEqual(newestFirst(seqs()));
		const days = all(doc, '[data-testid="log-day"]');
		expect(days.map((d) => text(d.querySelector('h2')))).toEqual([
			'Tuesday, October 13, 2026',
			'Monday, October 12, 2026',
			'Sunday, October 11, 2026',
		]);
		expect(all(days[0], '[data-testid="log-entry"]')).toHaveLength(4);
		// Prose, not cards: the list is .log-entries (list-style none, block), no grid.
		expect(all(doc, '.log-entries').every((ol) => !/\bgrid\b/.test(ol.className))).toBe(true);
	});

	test('[person · project], with the person and the project as links, and the card linked', async () => {
		const doc = await log();
		const e = doc.querySelector('#e107')!;
		expect(text(e.querySelector('.log-bracket'))).toBe('[ccb, for todd · byollm]');
		expect(all(e, '.log-bracket a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
			['todd', '/log/todd'],
			['byollm', '/log/byollm'],
		]);
		expect(e.querySelector('a.log-card')!.getAttribute('href')).toBe('https://signals.oftomorrow.net/board?scope=ot.byollm&card=953');
		expect(text(e.querySelector('a.log-card'))).toBe('#953');
		const line = (id: string) => text(doc.querySelector(`#${id} .log-line`));
		expect(line('e107')).toContain('Built #953: byollm.cloud opens: the signup gate comes off (8m)');
		expect(line('e105')).toContain('Landed #944 as 358ac1c in signals: The build log is served from the ledger');
		expect(line('e106')).toContain("Decided on #953: the gate's function keeps its name");
		expect(line('e104')).toContain('[todd · press] Said #799: Press emits ad lifecycle events to Signals now.');
		expect(line('e103')).toContain('Ruled on #770: a person may hold several cards');
		// job.done is the builder's done, not the card landing (decision #170): a reviewed job's
		// done never says "Done". A no-review job's (signals #1140) has nothing to land: it does.
		expect(all(doc, '.log-line').filter((l) => /\bDone #/.test(text(l))).map((l) => l.closest('[id]')!.id)).toEqual(['e100']);
		expect(line('e100')).toContain('Done #1150: Watch the nightly backup (2m)');
		expect(line('e100')).not.toContain('Built');
		expect(line('e102')).toContain('(2h 14m · 2 attempts)');
	});

	test("the feed's text is text: markup escaped, backticks as code", async () => {
		const doc = await log();
		const body = doc.querySelector('#e107 .log-body')!;
		expect(text(body)).toContain('<script>alert(1)</script> stays text.');
		expect(all(doc, '[data-testid="log-entry"] script')).toHaveLength(0);
		expect(all(body, 'code').map(text)).toEqual(['pnpm test']);
	});

	test('the filters are URLs: everything, the people the feed serves, the projects', async () => {
		const doc = await log();
		const links = all(doc, '[data-testid="log-filters"] a');
		expect(links.map(text)).toEqual(['Everything', 'todd', 'byollm', 'press', 'signals', 'RSS']);
		expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map(text)).toEqual(['Everything']);
		expect(doc.querySelector('link[rel="alternate"][type="application/rss+xml"]')!.getAttribute('href')).toBe('/log/rss.xml');
	});
});

describe('/log/<person> and /log/<project>', () => {
	for (const [slug, heading, scope, person] of [
		['todd', 'Todd', undefined, 'todd'],
		['byollm', 'BYOLLM', 'ot.byollm', undefined],
		['signals', 'Signals', 'ot.signals', undefined],
		['press', 'Press', 'ot.press', undefined],
	] as const) {
		test(`/log/${slug} renders its own stream`, async () => {
			const doc = await slugPage(slug);
			expect(text(doc.querySelector('[data-testid="log-heading"]'))).toBe(heading);
			const want = newestFirst(seqs(scope, person));
			expect(want.length).toBeGreaterThan(0);
			expect(seqOf(all(doc, '[data-testid="log-entry"]'))).toEqual(want);
			const current = all(doc, '[data-testid="log-filters"] a').filter((a) => a.getAttribute('aria-current') === 'page');
			expect(current.map(text)).toEqual([slug]);
			expect(doc.querySelector('link[rel="alternate"][type="application/rss+xml"]')!.getAttribute('href')).toBe(`/log/${slug}/rss.xml`);
		});
	}

	test('a page asks the feed, in the browser, for its own stream and only what is newer than the build', async () => {
		// The browser's read is queryUrl over these data- attributes (src/lib/log-client.ts).
		for (const [slug, scope, person] of [
			['byollm', 'ot.byollm', undefined],
			['todd', undefined, 'todd'],
		] as const) {
			const stream = (await slugPage(slug)).querySelector<HTMLElement>('[data-log-stream]')!;
			expect(stream.dataset.scope).toBe(scope);
			expect(stream.dataset.person).toBe(person);
			expect(stream.dataset.since).toBe(String(Math.max(...seqs(scope, person))));
			const url = queryUrl(stream.dataset.feed!, { scope: stream.dataset.scope, person: stream.dataset.person, live: true, since: Number(stream.dataset.since), limit: 200 });
			expect(url).toContain(scope ? `scope=${scope}` : `person=${person}`);
			expect(url).toContain('since=107');
			expect(url).toContain('live=1');
			// Absent until the feed says something is claimed.
			expect(stream.querySelector('[data-live]')!.hasAttribute('hidden')).toBe(true);
		}
	});

	test('a person the feed does not serve is a 404: kevin and lis (stream off in the fixture) and a stranger', async () => {
		// A static site's 404 is a path the build does not make.
		const pages = (await LogSlug.getStaticPaths()).map((p) => p.params.slug);
		const feeds = (await LogSlugRss.getStaticPaths()).map((p) => p.params.slug);
		expect(pages.sort()).toEqual(['byollm', 'press', 'signals', 'todd']);
		expect(feeds.sort()).toEqual(pages);
		for (const slug of ['kevin', 'lis', 'nobody', 'vault']) {
			expect(pages, slug).not.toContain(slug);
			expect(feeds, slug).not.toContain(slug);
		}
		const doc = await log();
		expect(all(doc, 'a').filter((a) => text(a) === 'kevin')).toHaveLength(0);
	});
});

describe('home: the build log strip', () => {
	test('under From the workshop: the newest five, each with its [person · project], linking to /log', async () => {
		const doc = await render(Home);
		const sections = all(doc, 'main section[id]').map((s) => s.id);
		expect(sections.indexOf('log')).toBe(sections.indexOf('workshop') + 1);
		const strip = doc.querySelector('[data-testid="log-strip"]')!;
		const entries = all(strip, '[data-testid="strip-entry"]');
		expect(seqOf(entries)).toEqual([107, 106, 105, 104, 103]);
		expect(entries.map((e) => text(e.querySelector('.log-bracket')))).toEqual([
			'[ccb, for todd · byollm]',
			'[ccb, for todd · byollm]',
			'[ccs, for todd · signals]',
			'[todd · press]',
			'[todd · signals]',
		]);
		expect(text(entries[0])).toContain('Built #953');
		expect(entries.filter((e) => /\bDone #/.test(text(e)))).toHaveLength(0);
		expect(entries[0].querySelector('a.log-title')!.getAttribute('href')).toBe('/log#e107');
		expect(all(strip, '.log-body')).toHaveLength(0);
		expect(strip.querySelector('[data-testid="all-log"]')!.getAttribute('href')).toBe('/log');
		// No live line in the markup: the browser adds one only when the feed says so.
		expect(all(strip, '[data-testid="log-live"]')).toHaveLength(0);
		expect(strip.querySelector('[data-live]')!.hasAttribute('hidden')).toBe(true);
		expect(text(strip)).not.toMatch(/idle/i);
	});
});

describe('RSS', () => {
	const { DOMParser } = new JSDOM('').window;
	const kids = (el: Element, name: string) => [...el.children].filter((c) => c.tagName === name);
	const child = (el: Element, name: string) => kids(el, name)[0]?.textContent ?? null;

	async function rss(path: string): Promise<string> {
		const slug = path.match(/^\/log\/([^/]+)\/rss\.xml$/)?.[1];
		if (!slug) return (await LogRss.GET({ site: SITE } as any)).text();
		const p = (await LogSlugRss.getStaticPaths()).find((x) => x.params.slug === slug)!;
		return (await LogSlugRss.GET({ site: SITE, params: p.params, props: p.props } as any)).text();
	}

	for (const [path, count] of [
		['/log/rss.xml', seqs().length],
		['/log/todd/rss.xml', seqs(undefined, 'todd').length],
		['/log/byollm/rss.xml', seqs('ot.byollm').length],
		['/log/press/rss.xml', seqs('ot.press').length],
		['/log/signals/rss.xml', seqs('ot.signals').length],
	] as const) {
		test(`${path} is valid RSS 2.0, pointed at this site`, async () => {
			const src = await rss(path);
			const doc = new DOMParser().parseFromString(src, 'application/xml');
			expect(doc.querySelector('parsererror')?.textContent ?? null).toBeNull();
			const root = doc.documentElement;
			expect(root.tagName).toBe('rss');
			expect(root.getAttribute('version')).toBe('2.0');
			const channels = kids(root, 'channel');
			expect(channels).toHaveLength(1);
			const channel = channels[0];
			expect(child(channel, 'link')).toBe(`https://oftomorrow.net${path.replace(/rss\.xml$/, '')}`);
			expect(kids(channel, 'atom:link')[0]?.getAttribute('href')).toBe(`https://oftomorrow.net${path}`);
			expect(child(channel, 'title')).toMatch(/^Of Tomorrow build log/);
			expect(child(channel, 'description')).toBeTruthy();
			const items = kids(channel, 'item');
			expect(items).toHaveLength(count);
			const guids = new Set<string>();
			for (const item of items) {
				expect(child(item, 'title')).toMatch(/^\[[^\]]+ · ot\.[a-z]+\] (done|landed|decided|ruled|said)/);
				expect(child(item, 'link')).toMatch(/^https:\/\/signals\.oftomorrow\.net\/board\?scope=ot\.[a-z]+&card=\d+$/);
				expect(child(item, 'pubDate')).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
				const guid = child(item, 'guid')!;
				expect(guids.has(guid), guid).toBe(false);
				guids.add(guid);
			}
			expect(src).not.toContain('<script>');
		});
	}
});
