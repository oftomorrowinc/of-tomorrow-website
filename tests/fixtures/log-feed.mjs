// A stand-in for signals' GET /api/log (job #944), so what the tests render
// reads a known feed: Vitest answers the build's fetch with `answer` (tests/
// setup.ts), and run as a script it is a server on :4398 for the build the
// browser spec runs against. It answers the way the real one
// does: newest first, ?scope (a prefix), ?person (404 when the person's stream
// is not served), ?since, ?limit, ?live=1, ?format=rss, CORS *. The RSS is
// signals' own writer (apps/web/lib/log.ts, toRss), ported.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const fixture = JSON.parse(readFileSync(new URL('./log-feed.json', import.meta.url), 'utf8'));
const port = Number(process.env.PORT ?? 4398);
export const FEED_URL = `http://localhost:${port}/api/log`;

const KIND_WORD = {
	'job.done': 'done',
	'job.landed': 'landed',
	'decision.logged': 'decided',
	'decision.ruled': 'ruled',
	message: 'said',
};

function xml(t) {
	return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function entryText(e) {
	if (e.kind === 'job.landed') return `Landed${e.commit ? ` as ${e.commit}` : ''}${e.repo ? ` in ${e.repo}` : ''}.`;
	if (e.kind === 'job.done') return [e.body, e.worked ? `(${e.worked})` : null].filter(Boolean).join(' ');
	return e.body ?? '';
}

function toRss({ title, link, self, entries }) {
	const items = entries.map((e) =>
		[
			'    <item>',
			`      <title>${xml(`[${e.by} · ${e.scope}] ${KIND_WORD[e.kind]}${e.id ? ` #${e.id}` : ''}${e.title ? `: ${e.title}` : ''}`)}</title>`,
			`      <link>${xml(e.link ?? link)}</link>`,
			`      <description>${xml(entryText(e))}</description>`,
			`      <guid isPermaLink="false">${xml(`${link}#${e.seq}`)}</guid>`,
			`      <pubDate>${new Date(e.at).toUTCString()}</pubDate>`,
			...e.people.map((p) => `      <category>${xml(p)}</category>`),
			'    </item>',
		].join('\n'),
	);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'  <channel>',
		`    <title>${xml(title)}</title>`,
		`    <link>${xml(link)}</link>`,
		'    <description>What the people and agents building Of Tomorrow did, as the ledger recorded it.</description>',
		`    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>`,
		...(entries[0] ? [`    <lastBuildDate>${new Date(entries[0].at).toUTCString()}</lastBuildDate>`] : []),
		'    <ttl>1</ttl>',
		...items,
		'  </channel>',
		'</rss>',
		'',
	].join('\n');
}

/** The feed's answer to a URL: { status, headers, body }. */
export function answer(href) {
	const url = new URL(href, FEED_URL);
	const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
	const fail = (status, message) => ({
		status,
		headers: { ...headers, 'content-type': 'application/json' },
		body: JSON.stringify({ error: { code: 'not_found', message } }),
	});
	if (url.pathname !== '/api/log') return fail(404, 'no such route');
	const scope = url.searchParams.get('scope') || 'ot';
	const person = url.searchParams.get('person') || null;
	if (!fixture.scopes.includes(scope)) return fail(404, `no public log for '${scope}'`);
	if (person && !fixture.served.includes(person)) return fail(404, `no public stream for '${person}'`);
	const since = url.searchParams.has('since') ? Number(url.searchParams.get('since')) : null;
	const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
	let entries = fixture.entries
		.filter((e) => e.scope === scope || e.scope.startsWith(`${scope}.`))
		.filter((e) => !person || e.people.includes(person))
		.filter((e) => since === null || e.seq > since)
		.sort((a, b) => b.seq - a.seq);
	entries = since === null ? entries.slice(0, limit) : entries.slice(-limit);
	if (url.searchParams.get('format') === 'rss') {
		return {
			status: 200,
			headers: { ...headers, 'content-type': 'application/rss+xml; charset=utf-8' },
			body: toRss({ title: `Of Tomorrow build log — ${scope}`, link: `${FEED_URL}?scope=${scope}`, self: url.href, entries }),
		};
	}
	const live = ['1', 'true'].includes(url.searchParams.get('live') ?? '');
	return {
		status: 200,
		headers: { ...headers, 'content-type': 'application/json' },
		body: JSON.stringify({
			scope,
			person,
			entries,
			next_since: entries.reduce((m, e) => Math.max(m, e.seq), since ?? 0),
			...(live ? { live: fixture.live } : {}),
		}),
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	createServer((req, res) => {
		const { status, headers, body } = answer(req.url);
		res.writeHead(status, headers);
		res.end(body);
	}).listen(port, () => console.log(`log fixture feed on :${port}`));
}
