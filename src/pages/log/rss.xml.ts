import type { APIRoute } from 'astro';
import { readRss } from '../../lib/log';

export const GET: APIRoute = async ({ site }) =>
	new Response(await readRss({}, new URL('/log/', site).href, 'Of Tomorrow build log'), {
		headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
	});
