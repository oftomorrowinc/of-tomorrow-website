// Every Vitest file renders against known feeds, never the network: the
// build log's fetches are answered by the fixture feed's own code
// (tests/fixtures/log-feed.mjs, no server), todd.oftomorrow.net's RSS by
// tests/fixtures/workshop-feed.xml, and anything else is refused.
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { FEED_URL, answer } from './fixtures/log-feed.mjs';

process.env.LOG_FEED_URL = FEED_URL;

export const WORKSHOP_RSS = readFileSync(new URL('./fixtures/workshop-feed.xml', import.meta.url), 'utf8');

vi.stubGlobal('fetch', async (input: string | URL | Request) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	if (url.startsWith(FEED_URL)) {
		const { status, headers, body } = answer(url);
		return new Response(body, { status, headers });
	}
	if (url === 'https://todd.oftomorrow.net/rss.xml') {
		return new Response(WORKSHOP_RSS, { headers: { 'content-type': 'application/rss+xml' } });
	}
	throw new Error(`tests/setup.ts: no fixture answers ${url}`);
});
