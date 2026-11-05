import { describe, test, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { z } from 'astro:content';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { collections } from '../src/content.config';
import Home from '../src/pages/index.astro';
import Today from '../src/pages/today.astro';
import { ACCENT, ASKED, fence, liftBody, NAMED, PROJECTS, slugOf, type StoryText } from '../src/lib/today';
import { GET as todayFeed } from '../src/pages/today.xml';
import { all, render, text } from './render';
import { cssVar } from './tokens';

// Today at Of Tomorrow (specs/news_001.md). The fence test (§5): every story
// in src/content/today/ is checked against fences 2, 3 and 5 and the §2
// limits, and each fence is shown to bite on a story built to break it. The
// same fence() runs in the collection's schema, so `astro build` fails too.

const DIR = 'src/content/today';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
// The parser Astro's own Markdown loader uses, so the test reads what the build reads.
const parse = (f: string) => {
	const raw = readFileSync(`${DIR}/${f}`, 'utf8');
	const { frontmatter } = parseFrontmatter(raw);
	return { data: liftBody(frontmatter, raw) as Record<string, unknown> & StoryText & { date: Date } };
};

// A story that passes every fence; each mutation below breaks exactly one.
const good: StoryText = {
	title: 'The weekly gets a magazine',
	body: "Todd's recording room is nearly done, so the show got its look. The whole pack imports into OBS in one go.",
	author: 'cw',
	picture: 'a paper masthead strip beside a small camera',
};
const broken = (patch: Partial<StoryText>) => fence({ ...good, ...patch });

describe('today: the stories in the repo', () => {
	test('there are stories, and every one passes the fences', () => {
		expect(files.length).toBeGreaterThanOrEqual(3);
		for (const f of files) expect(fence(parse(f).data), f).toEqual([]);
	});

	test('every file is <yyyy-mm-dd>-<slug>.md, dated as named, with one body', () => {
		for (const f of files) {
			expect(f).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
			const { data } = parse(f);
			expect(data.date.toISOString().slice(0, 10), f).toBe(f.slice(0, 10));
			expect(PROJECTS, f).toContain(data.project);
			expect(data.body, `${f}: a body, as body: or as prose`).toBeTruthy();
			expect(data.bodyProse, `${f}: body: and prose both`).toBeUndefined();
		}
	});

	test('the schema runs the fences: a fenced story does not parse, a good one does', () => {
		const schema = (collections.today.schema as unknown as (ctx: { image: () => z.ZodTypeAny }) => z.ZodTypeAny)({ image: () => z.any() });
		const story = { ...good, date: '2026-11-04', project: 'site', refs: [7292] };
		expect(schema.safeParse(story).success).toBe(true);
		const bad = schema.safeParse({ ...story, body: 'Set API_KEY=abc first. Then it runs.' });
		expect(bad.success).toBe(false);
		expect(bad.error!.issues.map((i: { message: string }) => i.message).join('\n')).toMatch(/env-shaped/);
		expect(schema.safeParse({ ...story, project: 'hub' }).success).toBe(false);
		expect(schema.safeParse({ ...story, title: 'x'.repeat(61) }).success).toBe(false);
	});

	// The daily task (signals' daily-stories.ts, card 2) writes the body as the
	// file's prose and refs as strings; card 1 wrote both in the frontmatter.
	// The loader lifts the prose into body, so one schema and one fence read both.
	test("the daily task's shape: body as prose, refs as strings, through the same schema and fences", () => {
		const schema = (collections.today.schema as unknown as (ctx: { image: () => z.ZodTypeAny }) => z.ZodTypeAny)({ image: () => z.any() });
		const file = (front: string, prose: string) => `---\n${front}\n---\n\n${prose}\n`;
		const front = 'date: 2026-11-04\ntitle: "The weekly gets a magazine"\nproject: site\nauthor: cw\nrefs: ["7292"]\npicture: "a paper masthead"';
		const raw = file(front, good.body);
		const lifted = liftBody(parseFrontmatter(raw).frontmatter, raw);
		expect(lifted.body).toBe(good.body);
		const ok = schema.safeParse(lifted);
		expect(ok.success).toBe(true);
		expect(ok.data.refs).toEqual([7292]);
		// The prose goes through the fences like a field would.
		const fenced = file(front, 'Set API_KEY=abc first. Then it runs.');
		const bad = schema.safeParse(liftBody(parseFrontmatter(fenced).frontmatter, fenced));
		expect(bad.success).toBe(false);
		expect(bad.error!.issues.map((i: { message: string }) => i.message).join('\n')).toMatch(/env-shaped/);
		// One body, one place: a body: field and prose both is refused.
		const both = file(`${front}\nbody: "${good.body}"`, 'And more prose. Here.');
		const twice = schema.safeParse(liftBody(parseFrontmatter(both).frontmatter, both));
		expect(twice.success).toBe(false);
		expect(twice.error!.issues.map((i: { message: string }) => i.message).join('\n')).toMatch(/both a body: field and prose/);
		// No prose: the frontmatter as it was.
		const plain = { title: 'x', body: 'y' };
		expect(liftBody(plain, '---\ntitle: x\nbody: y\n---\n')).toBe(plain);
	});
});

describe('today: /today.xml (§6)', () => {
	test('every story, newest first, each linking to /today#slug with its body as the description', async () => {
		const res = await todayFeed({ site: new URL('https://oftomorrow.net') } as never);
		const xml = await res.text();
		expect(xml).toMatch(/^<\?xml/);
		expect(xml).toContain('<title>Today at Of Tomorrow</title>');
		const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
		expect(items.length).toBe(files.length);
		const dates = items.map((i) => Date.parse(i.match(/<pubDate>(.*?)<\/pubDate>/)![1]));
		expect([...dates].sort((a, b) => b - a)).toEqual(dates);
		for (const f of files) {
			const { data } = parse(f);
			const link = `https://oftomorrow.net/today#${slugOf(f)}`;
			const item = items.find((i) => i.includes(`<link>${link}</link>`));
			expect(item, f).toBeTruthy();
			expect(item, f).toContain(`<dc:creator>`);
			const unescape = (t: string) => t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
			expect(unescape(item!.match(/<description>([\s\S]*?)<\/description>/)![1]), f).toBe(data.body);
		}
	});
});

describe('today: the fences bite (§5)', () => {
	test('the good story is clean', () => expect(fence(good)).toEqual([]));

	test('2. identifiers: a ULID, a UUID, tokens, a token-shaped string, NAME=value', () => {
		expect(broken({ body: 'The job 01JC8ZQ4X7M3V9T2R5K6W8Y0NB landed. It works.' }).join()).toMatch(/a ULID/);
		expect(broken({ body: 'Run 3f2b8c1e-9a4d-4e7f-b6c5-1d2e3f4a5b6c landed. It works.' }).join()).toMatch(/a UUID/);
		expect(broken({ body: 'The key ghp_a1B2c3D4e5F6g7H8 leaked. It is gone.' }).join()).toMatch(/a token/);
		expect(broken({ body: 'Use sk-ant-api03-abcdefgh to call it. It works.' }).join()).toMatch(/a token/);
		expect(broken({ picture: 'a note reading 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b' }).join()).toMatch(/token-shaped/);
		expect(broken({ body: 'Set LEDGER_KEY=hunter2 and go. It works.' }).join()).toMatch(/env-shaped/);
		expect(broken({ title: 'PORT=4399 is the port' }).join()).toMatch(/env-shaped/);
		// Versions, years and plain numbers are prose, not identifiers.
		expect(broken({ body: 'byollm 0.1.5 landed in 2026 with 11 parts. Card #7294 was one.' })).toEqual([]);
	});

	test('2. a job id written as a link: in the prose, or a link into the ledger', () => {
		expect(broken({ body: 'It landed as [#7294](https://signals.oftomorrow.net/jobs/7294). It works.' }).join()).toMatch(/carries a link/);
		expect(broken({ body: 'See https://example.com/7294 for it. It works.' }).join()).toMatch(/carries a link/);
		expect(broken({ link: 'https://signals.oftomorrow.net/jobs/7294' }).join()).toMatch(/into the ledger/);
		expect(broken({ link: 'https://example.com/cards/7294' }).join()).toMatch(/into the ledger/);
		expect(broken({ link: 'https://example.com/notes#7294' }).join()).toMatch(/into the ledger/);
		expect(broken({ link: 'http://oftomorrow.net/blog/x' }).join()).toMatch(/not an https URL/);
		expect(broken({ link: 'https://oftomorrow.net/blog/we-started-writing' })).toEqual([]);
	});

	test('3. people: the author and anyone named must be in scripts/today/named.json', () => {
		expect(NAMED).toEqual(['todd', 'cw', 'owl']);
		expect(ASKED).toEqual(expect.arrayContaining(['kevin', 'lis']));
		for (const a of NAMED) expect(broken({ author: a }), a).toEqual([]);
		expect(broken({ author: 'kevin' }).join()).toMatch(/author "kevin" is not in/);
		expect(broken({ author: 'someone' }).join()).toMatch(/author "someone" is not in/);
		expect(broken({ body: 'Kevin said nothing to push here. That was right.' }).join()).toMatch(/names kevin/);
		expect(broken({ title: 'Lis reads the numbers' }).join()).toMatch(/names lis/);
		// A word that contains a name is not the name.
		expect(broken({ body: 'The list got shorter. Nothing else moved.' })).toEqual([]);
	});

	test('5. no em dashes (the house rules, in the stories as in the frame)', () => {
		expect(broken({ title: 'The weekly — a magazine' }).join()).toMatch(/title has an em dash/);
		expect(broken({ body: 'It landed &mdash; finally. It works.' }).join()).toMatch(/body has an em dash/);
		// The en dash the site uses in its place is fine.
		expect(broken({ body: 'It landed – finally. It works.' })).toEqual([]);
	});

	test('§2 limits: title ≤ 60, body ≤ 320 and two or three sentences', () => {
		expect(broken({ title: 'x'.repeat(60) })).toEqual([]);
		expect(broken({ title: 'x'.repeat(61) }).join()).toMatch(/title is 61 characters, over 60/);
		const sentence = 'This sentence is exactly fifty characters long ok. ';
		expect(sentence.length).toBe(51);
		expect(broken({ body: 'x'.repeat(318) + '. y.' }).join()).toMatch(/body is 322 characters, over 320/);
		expect(broken({ body: 'Only one sentence here.' }).join()).toMatch(/1 sentences, not 2 or 3/);
		expect(broken({ body: sentence.repeat(4).trim() }).join()).toMatch(/4 sentences, not 2 or 3/);
	});
});

describe('today: the frame (§5.5, §6)', () => {
	beforeAll(() => {
		process.env.TODAY_DATE = '2026-11-05';
	});

	test('the homepage strip: the spec’s dateline, the newest stories as cards linking to /today#slug, "all stories"', async () => {
		const doc = await render(Home);
		const strip = doc.querySelector('[data-testid="today-strip"]')!;
		expect(strip).toBeTruthy();
		// Between the hero and the first section.
		expect(strip.previousElementSibling?.id).toBe('cover');
		expect(text(strip.querySelector('[data-testid="today-dateline"]'))).toBe('Today at Of Tomorrow · Thursday 5 November');
		expect(text(strip.querySelector('[data-testid="all-stories"]'))).toBe('All stories →');
		expect(strip.querySelector('[data-testid="all-stories"]')!.getAttribute('href')).toBe('/today');
		expect(all(strip, 'button').map((b) => b.getAttribute('aria-label'))).toEqual(['Previous', 'Next']);

		const cards = all(strip, '[data-testid="strip-card"]');
		expect(cards.length).toBe(Math.min(files.length, 15));
		const dates = cards.map((c) => c.querySelector('[data-slug]')!.getAttribute('data-slug')!).map((slug) => files.find((f) => slugOf(f) === slug)!.slice(0, 10));
		expect(dates).toEqual([...dates].sort().reverse());
		for (const c of cards) {
			const slug = c.querySelector('[data-slug]')!.getAttribute('data-slug');
			expect(c.querySelector('a')!.getAttribute('href')).toBe(`/today#${slug}`);
			expect(c.querySelector('[data-testid="story-title"]')!.className).toContain('font-display');
			expect(text(c.querySelector('[data-testid="story-caption"]'))).toMatch(/^(Todd|CW|Owl) · (BYOLLM|Press|Signals|The site|Studio)$/);
			// Every card has a picture or, with none, the monogram tile (card 3): never a hole.
			expect(c.querySelectorAll('[data-testid="monogram"], [data-testid="picture"]').length).toBe(1);
			// Refs are for us: never on the strip, never a link.
			expect(c.querySelector('[data-testid="story-refs"]')).toBeNull();
		}
	});

	test('/today: newest first, grouped by day, refs as plain numbers, filters by project and author', async () => {
		const doc = await render(Today);
		expect(text(doc.querySelector('[data-testid="today-heading"]'))).toBe('Today at Of Tomorrow');
		const days = all(doc, '[data-testid="today-day"]').map((d) => d.getAttribute('data-day')!);
		expect(days).toEqual([...new Set(files.map((f) => f.slice(0, 10)))].sort().reverse());
		expect(text(doc.querySelector('[data-day="2026-11-04"] h2'))).toBe('Wednesday 4 November 2026');

		const stories = all(doc, '[data-testid="story"]');
		expect(stories.length).toBe(files.length);
		for (const s of stories) {
			expect(s.id).toBe(s.getAttribute('data-slug'));
			expect(s.closest('[data-testid="today-day"]')!.getAttribute('data-day')).toBe(files.find((f) => slugOf(f) === s.id)!.slice(0, 10));
		}
		const byollm = doc.getElementById('tools-and-images-for-byollm')!;
		expect(text(byollm.querySelector('[data-testid="story-refs"]'))).toBe('· #6933');
		expect(byollm.querySelectorAll('[data-testid="story-refs"] a').length).toBe(0);

		const filters = all(doc, '[data-testid="today-filters"] a').map((a) => a.getAttribute('href'));
		expect(filters).toEqual(['/today', ...PROJECTS.map((p) => `/today?project=${p}`), ...NAMED.map((a) => `/today?author=${a}`)]);
	});

	test('frame copy: the standing text has no em dash, on the strip, on /today or in its title', async () => {
		const home = await render(Home);
		const page = await render(Today);
		expect(text(page.querySelector('title'))).not.toMatch(/—/);
		for (const frame of [...all(home, '[data-today-frame]'), ...all(page, '[data-today-frame]')]) {
			// The frame, without the stories in it (those are fenced above).
			const copy = frame.cloneNode(true) as Element;
			copy.querySelectorAll('[data-testid="story"]').forEach((s) => s.remove());
			expect(text(copy)).not.toMatch(/—/);
			for (const b of all(copy, '[aria-label]')) expect(b.getAttribute('aria-label')).not.toMatch(/—/);
		}
	});
});

describe('today: the monogram tile (§4)', () => {
	test('five variants, one per project, each accent a magazine token', async () => {
		expect(Object.keys(ACCENT).sort()).toEqual([...PROJECTS].sort());
		expect(new Set(Object.values(ACCENT)).size).toBe(PROJECTS.length);
		for (const accent of Object.values(ACCENT)) expect(cssVar(accent), accent).toMatch(/^#[0-9a-f]{6}$/i);
	});

	test('a story without a picture draws the tile in its project’s accent, on paper', async () => {
		const doc = await render(Today);
		const tiles = all(doc, '[data-testid="monogram"]');
		expect(tiles.length).toBe(files.filter((f) => !parse(f).data.image).length);
		for (const t of tiles) {
			const project = t.getAttribute('data-project') as keyof typeof ACCENT;
			expect(t.closest('[data-testid="story"]')!.getAttribute('data-project')).toBe(project);
			expect(t.querySelector('rect')!.getAttribute('style')).toBe('fill: var(--paper)');
			expect(t.querySelector('[data-part="disc"]')!.getAttribute('style')).toBe(`fill: var(--${ACCENT[project]})`);
			expect(t.querySelectorAll('[data-part="o"], [data-part="t"]').length).toBe(3);
		}
	});
});
