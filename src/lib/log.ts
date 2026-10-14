// THE BUILD LOG: signals.oftomorrow.net's public feed (`GET /api/log`, job
// #944), read at BUILD time the way "From the workshop" reads
// todd.oftomorrow.net, and read again in the browser for the live line and
// anything newer than the build. What may be shown is decided by the feed —
// its fences are in its query — so nothing here filters, it only renders.
//
// The renderers are plain functions returning HTML so the page and the
// browser write an entry the same way.

export const LOG_FEED_URL = 'https://signals.oftomorrow.net/api/log';

/** The feed the build reads. Tests point it at a fixture server. */
export function feedUrl(): string {
	return (typeof process !== 'undefined' && process.env.LOG_FEED_URL) || LOG_FEED_URL;
}

/** The people who may have a page. A page is built only for those the feed
 *  serves (it answers 404 for a person whose stream is off): this list is
 *  only the candidates, and a page appears on the first build after that
 *  person's stream is turned on. */
export const LOG_PEOPLE = ['todd', 'kevin', 'lis'] as const;

/** The projects with a page: slug → the feed's scope. */
export const LOG_PROJECTS: Record<string, { scope: string; name: string }> = {
	byollm: { scope: 'ot.byollm', name: 'BYOLLM' },
	press: { scope: 'ot.press', name: 'Press' },
	signals: { scope: 'ot.signals', name: 'Signals' },
};

/** The day an entry belongs to is the day where the work is done. */
export const LOG_TIME_ZONE = 'America/New_York';

/** How many entries a page is built with; the feed holds the rest. */
export const PAGE_LIMIT = 100;

export interface LogEntry {
	seq: number;
	at: string;
	kind: 'job.done' | 'job.landed' | 'decision.logged' | 'decision.ruled' | 'message';
	scope: string;
	project: string;
	people: string[];
	/** "ccs, for todd" */
	by: string;
	title: string | null;
	body: string | null;
	link: string | null;
	id: string | null;
	commit?: string | null;
	repo?: string | null;
	worked?: string | null;
}

export interface LiveLine {
	by: string;
	id: string;
	title: string;
	scope: string;
	/** "ccs is on #915 for 37m" */
	line: string;
}

export interface LogPage {
	entries: LogEntry[];
	live?: LiveLine[];
	next_since?: number;
}

/** Where an entry or a page links: which people and projects have pages. */
export interface LinkContext {
	people: string[];
	projects: string[];
}

export interface FeedQuery {
	scope?: string;
	person?: string;
	limit?: number;
	since?: number;
	live?: boolean;
	format?: 'json' | 'rss';
}

export function queryUrl(base: string, q: FeedQuery): string {
	const params = new URLSearchParams();
	if (q.scope) params.set('scope', q.scope);
	if (q.person) params.set('person', q.person);
	if (q.since !== undefined) params.set('since', String(q.since));
	if (q.limit !== undefined) params.set('limit', String(q.limit));
	if (q.live) params.set('live', '1');
	if (q.format === 'rss') params.set('format', 'rss');
	const s = params.toString();
	return s ? `${base}?${s}` : base;
}

// ---------------------------------------------------------------- the build

const cache = new Map<string, Promise<Response | Error>>();

/** One request per URL per build: the person probe and the person page ask
 *  the same question. */
function get(url: string): Promise<Response | Error> {
	let hit = cache.get(url);
	if (!hit) {
		hit = fetch(url, { signal: AbortSignal.timeout(10_000) }).catch((err: Error) => err);
		cache.set(url, hit);
	}
	return hit.then((r) => (r instanceof Response ? r.clone() : r));
}

/** A page of the feed, or null when the feed says there is no such stream
 *  (404). Unreachable is an empty page and a warning: the browser fills it. */
export async function readFeed(q: FeedQuery): Promise<LogPage | null> {
	const url = queryUrl(feedUrl(), { limit: PAGE_LIMIT, ...q });
	const res = await get(url);
	if (res instanceof Error || (!res.ok && res.status !== 404)) {
		console.warn(`[log] ${url} unreachable (${res instanceof Error ? res.message : `HTTP ${res.status}`}); built empty`);
		return { entries: [] };
	}
	if (res.status === 404) return null;
	const page = (await res.json()) as LogPage;
	console.log(`[log] ${url}: ${page.entries.length} entries`);
	return page;
}

/** The people the feed serves. If it cannot be asked, Todd's page is built
 *  (his stream is on) and nobody else's. */
export async function peopleServed(): Promise<string[]> {
	const served: string[] = [];
	for (const person of LOG_PEOPLE) {
		const url = queryUrl(feedUrl(), { limit: PAGE_LIMIT, person });
		const res = await get(url);
		if (res instanceof Error || (!res.ok && res.status !== 404)) {
			if (person === 'todd') served.push(person);
		} else if (res.ok) {
			served.push(person);
		}
	}
	return served;
}

/** The projects whose scope the feed serves (a private scope is a 404). */
export async function projectsServed(): Promise<string[]> {
	const served: string[] = [];
	for (const [slug, { scope }] of Object.entries(LOG_PROJECTS)) {
		if ((await readFeed({ scope })) !== null) served.push(slug);
	}
	return served;
}

/** Which people and projects have pages on this build. */
let context: Promise<LinkContext> | undefined;

export function linkContext(): Promise<LinkContext> {
	context ??= (async () => ({ people: await peopleServed(), projects: await projectsServed() }))();
	return context;
}

/** The feed's own RSS for a page, its channel pointed at this site. If the
 *  feed cannot be read, a valid empty channel. */
export async function readRss(q: FeedQuery, page: string, title: string): Promise<string> {
	const url = queryUrl(feedUrl(), { limit: 50, ...q, format: 'rss' });
	const self = `${page}rss.xml`;
	const res = await get(url);
	if (!(res instanceof Error) && res.ok) {
		return (await res.text())
			.replace(/<title>[^<]*<\/title>/, `<title>${xml(title)}</title>`)
			.replace(/<link>[^<]*<\/link>/, `<link>${xml(page)}</link>`)
			.replace(/<atom:link href="[^"]*"/, `<atom:link href="${xml(self)}"`);
	}
	console.warn(`[log] ${url} unreachable; an empty channel`);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'  <channel>',
		`    <title>${xml(title)}</title>`,
		`    <link>${xml(page)}</link>`,
		'    <description>What the people and agents building Of Tomorrow did, as the ledger recorded it.</description>',
		`    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>`,
		'  </channel>',
		'</rss>',
		'',
	].join('\n');
}

function xml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------- the rendering

export function esc(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Escaped prose, with `backticks` as code. */
function prose(s: string): string {
	return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** byollm from ot.byollm. */
export function projectSlug(scope: string): string {
	return scope.split('.')[1] ?? scope;
}

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: LOG_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});
const dayLabelFormat = new Intl.DateTimeFormat('en-US', {
	timeZone: LOG_TIME_ZONE,
	weekday: 'long',
	month: 'long',
	day: 'numeric',
	year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
	timeZone: LOG_TIME_ZONE,
	hour: 'numeric',
	minute: '2-digit',
});

/** 2026-10-13 */
export function dayKey(at: string): string {
	return dayKeyFormat.format(new Date(at));
}

export function dayLabel(at: string): string {
	return dayLabelFormat.format(new Date(at));
}

/** Newest day first, newest entry first within it. */
export function groupByDay(entries: LogEntry[]): { day: string; label: string; entries: LogEntry[] }[] {
	const days: { day: string; label: string; entries: LogEntry[] }[] = [];
	for (const e of [...entries].sort((a, b) => b.seq - a.seq)) {
		const day = dayKey(e.at);
		const last = days[days.length - 1];
		if (last?.day === day) last.entries.push(e);
		else days.push({ day, label: dayLabel(e.at), entries: [e] });
	}
	return days;
}

/** `[ccs, for todd · signals]`, the person and the project as links when
 *  they have pages. */
export function bracketHtml(e: LogEntry, ctx: LinkContext): string {
	const by = e.by
		.split(/(\b[a-z][\w-]*\b)/i)
		.map((part) =>
			ctx.people.includes(part)
				? `<a href="/log/${part}" class="log-person">${esc(part)}</a>`
				: esc(part),
		)
		.join('');
	const slug = projectSlug(e.scope);
	const project = ctx.projects.includes(slug)
		? `<a href="/log/${slug}" class="log-project">${esc(slug)}</a>`
		: esc(slug);
	return `<span class="log-bracket">[${by} · ${project}]</span>`;
}

const VERB: Record<LogEntry['kind'], string> = {
	'job.done': 'Built',
	'job.landed': 'Landed',
	'decision.logged': 'Decided',
	'decision.ruled': 'Ruled',
	message: 'Said',
};

/** "Landed #944 as 358ac1c in signals" — the card number links to the card. */
function headHtml(e: LogEntry): string {
	const card = e.id
		? e.link
			? ` <a href="${esc(e.link)}" class="log-card">#${esc(e.id)}</a>`
			: ` #${esc(e.id)}`
		: '';
	let head = `${VERB[e.kind]}${e.kind === 'decision.logged' || e.kind === 'decision.ruled' ? ' on' : ''}${card}`;
	if (e.kind === 'job.landed') {
		if (e.commit) head += ` as <code>${esc(e.commit)}</code>`;
		if (e.repo) head += ` in ${esc(e.repo)}`;
	}
	return head;
}

/** One entry, as prose: the bracket, what happened, the title, and on the log
 *  pages the body. */
export function entryHtml(e: LogEntry, ctx: LinkContext, opts: { body?: boolean; href?: string } = {}): string {
	const showBody = opts.body ?? true;
	const title = e.title ? prose(e.title) : '';
	const titled = title ? (opts.href ? `<a href="${esc(opts.href)}" class="log-title">${title}</a>` : title) : '';
	const worked = e.kind === 'job.done' && e.worked ? ` <span class="log-worked">(${esc(e.worked)})</span>` : '';
	const time = `<time datetime="${esc(e.at)}" class="log-time">${esc(timeFormat.format(new Date(e.at)))}</time>`;
	const lead = `${bracketHtml(e, ctx)} ${headHtml(e)}`;
	const body = e.body?.trim();
	// A message has no title; its body is the line.
	if (!titled && body) return `<p class="log-line">${lead}: ${prose(body)} ${time}</p>`;
	const line = `<p class="log-line">${lead}${titled ? `: ${titled}` : ''}${worked} ${time}</p>`;
	return showBody && body ? `${line}<p class="log-body">${prose(body)}</p>` : line;
}

/** "ccs is on #915 for 37m" — the card number links to the card. */
export function liveHtml(lines: LiveLine[]): string {
	return lines
		.map((l) => {
			const text = esc(l.line).replace(`#${esc(l.id)}`, `<a href="${esc(cardLink(l.scope, l.id))}" class="log-card">#${esc(l.id)}</a>`);
			return `<p class="log-live" data-testid="log-live" title="${esc(l.title)}"><span class="log-live-dot" aria-hidden="true"></span>${text}</p>`;
		})
		.join('');
}

/** The card, the way the feed links one (#944's cardLink). */
export function cardLink(scope: string, id: string): string {
	return `https://signals.oftomorrow.net/board?scope=${encodeURIComponent(scope)}&card=${encodeURIComponent(id)}`;
}
