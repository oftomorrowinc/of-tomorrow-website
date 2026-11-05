// Today at Of Tomorrow (specs/news_001.md): the story record's rules, and the
// helpers the strip and /today share. A story is a file in src/content/today/;
// the schema (src/content.config.ts) runs fence() on every one, so a story
// that breaks a fence fails `astro build` as well as tests/today.test.ts.
import named from '../../scripts/today/named.json';

/** §2: the small controlled list, the nodes. */
export const PROJECTS = ['byollm', 'press', 'signals', 'site', 'studio'] as const;
export type Project = (typeof PROJECTS)[number];

/**
 * §4: the project's accent, a magazine token (src/styles/magazine.css) by name.
 * Three accents and five projects: the house (site) takes ink, studio takes
 * body-muted, so no colour is invented for the tile.
 */
export const ACCENT: Record<Project, string> = {
	byollm: 'teal',
	press: 'poppy',
	signals: 'mustard',
	site: 'ink',
	studio: 'body-muted',
};

export const PROJECT_LABEL: Record<Project, string> = {
	byollm: 'BYOLLM',
	press: 'Press',
	signals: 'Signals',
	site: 'The site',
	studio: 'Studio',
};

/** How a signature reads: cw is CW, the rest are capitalised. */
export const authorLabel = (a: string): string => (a.length <= 2 ? a.toUpperCase() : a[0].toUpperCase() + a.slice(1));

/** §2 limits. */
export const LIMITS = { title: 60, body: 320, sentences: [2, 3] as const };

/** §5.3: people named with their okay, and people asked but not yet. */
export const NAMED: readonly string[] = named.named;
export const ASKED: readonly string[] = named.asked;

export interface StoryText {
	title: string;
	body: string;
	author: string;
	link?: string;
	picture?: string;
}

// §5.2: identifiers. Each pattern names what it is, so a failure says why.
const IDENTIFIERS: [string, RegExp][] = [
	['a ULID', /\b[0-9A-HJKMNP-TV-Z]{26}\b/i],
	['a UUID', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
	['a token', /\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{8,}|\bgh[opsu]_[A-Za-z0-9]{8,}|\bgithub_pat_\w{8,}|\bxox[abprs]-[\w-]{8,}|\bAKIA[0-9A-Z]{12,}|\beyJ[\w-]{8,}\.[\w-]+/],
	// A long unbroken run of letters and digits with both in it: a key, a hash, a secret.
	['a token-shaped string', /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{20,}\b/],
	['an env-shaped NAME=value', /\b[A-Z][A-Z0-9_]{2,}=\S/],
];

// §5.2: "no job ids as links". The prose is plain: a link in it is the
// ledger leaking in, whatever it points at; `link` may not point into the ledger.
const PROSE_LINK = /\[[^\]]*\]\([^)]*\)|https?:\/\/|\bwww\.|\b[\w-]+\.oftomorrow\.net\/|<a\s/i;
const LEDGER_LINK = /signals\.oftomorrow\.net|\/(?:jobs?|cards?|decisions?|rulings?)\/\d+|#\d+\b|[?&](?:job|card|id)=\d+/i;

const sentences = (s: string): number => (s.trim().match(/[.!?](?=\s|$)/g) ?? []).length;

/** Every fence (§5: 2, 3, 5) and limit (§2) the story breaks; empty when it may publish. */
export function fence(s: StoryText): string[] {
	const out: string[] = [];
	const prose: [string, string][] = [
		['title', s.title],
		['body', s.body],
		...(s.picture ? [['picture', s.picture] as [string, string]] : []),
	];

	// §2: the limits.
	if (s.title.length > LIMITS.title) out.push(`title is ${s.title.length} characters, over ${LIMITS.title}`);
	if (s.body.length > LIMITS.body) out.push(`body is ${s.body.length} characters, over ${LIMITS.body}`);
	const n = sentences(s.body);
	if (n < LIMITS.sentences[0] || n > LIMITS.sentences[1]) out.push(`body is ${n} sentences, not 2 or 3`);

	// §5.2: no identifiers.
	for (const [field, text] of [...prose, ...(s.link ? [['link', s.link] as [string, string]] : [])])
		for (const [what, re] of IDENTIFIERS) {
			const m = text.match(re);
			if (m) out.push(`${field} carries ${what}: "${m[0]}"`);
		}
	for (const [field, text] of prose) if (PROSE_LINK.test(text)) out.push(`${field} carries a link; the prose is plain (put a public link in link:)`);
	if (s.link) {
		if (!/^https:\/\//.test(s.link)) out.push(`link is not an https URL: "${s.link}"`);
		if (LEDGER_LINK.test(s.link)) out.push(`link points into the ledger: "${s.link}"`);
	}

	// §5.3: people only with their okay.
	if (!NAMED.includes(s.author)) out.push(`author "${s.author}" is not in scripts/today/named.json's named`);
	for (const person of ASKED)
		for (const [field, text] of prose)
			if (new RegExp(`\\b${person}\\b`, 'i').test(text)) out.push(`${field} names ${person}, who has not said yes (scripts/today/named.json)`);

	// §5.5 and the house rules: no em dashes.
	for (const [field, text] of prose) if (/—|&mdash;/.test(text)) out.push(`${field} has an em dash`);

	return out;
}

/** The slug a story is reached by: /today#<slug>, its file name without the date. */
export const slugOf = (id: string): string => id.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.mdx?$/, '');

const ymd = (d: Date): string => d.toISOString().slice(0, 10);

/** The day a story belongs to, as written in its file (UTC: a date has no zone). */
export const dayOf = (d: Date): string => ymd(d);

const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Thursday 5 November" (the dateline), or with the year (/today's days). Built from parts, so no ICU comma. */
export function longDay(d: Date, year = false): string {
	const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
	return [p.weekday, p.day, p.month, ...(year ? [p.year] : [])].join(' ');
}

/**
 * The dateline's day (§6, "THURSDAY 5 NOVEMBER"): the day the site was built,
 * in Todd's zone. TODAY_DATE=yyyy-mm-dd pins it (the tests and the screenshots).
 */
export function today(now: Date = new Date()): Date {
	const pinned = process.env.TODAY_DATE;
	if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return new Date(`${pinned}T00:00:00Z`);
	const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
	return new Date(`${local}T00:00:00Z`);
}

interface Dated {
	id: string;
	data: { date: Date };
}

/** Newest day first; within a day, the order the files sort in. */
export function newestFirst<T extends Dated>(stories: T[]): T[] {
	return [...stories].sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

/** Newest first, grouped by day. */
export function byDay<T extends Dated>(stories: T[]): { day: string; date: Date; stories: T[] }[] {
	const groups = new Map<string, T[]>();
	for (const s of newestFirst(stories)) {
		const d = dayOf(s.data.date);
		groups.set(d, [...(groups.get(d) ?? []), s]);
	}
	return [...groups].map(([day, stories]) => ({ day, date: new Date(`${day}T00:00:00Z`), stories }));
}
