import type { APIRoute, GetStaticPaths } from 'astro';
import { LOG_PROJECTS, linkContext, readRss } from '../../../lib/log';

export const getStaticPaths = (async () => {
	const ctx = await linkContext();
	return [
		...ctx.people.map((person) => ({ params: { slug: person }, props: { person } })),
		...ctx.projects.map((slug) => ({ params: { slug }, props: { scope: LOG_PROJECTS[slug].scope } })),
	];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props, site }) => {
	const { person, scope } = props as { person?: string; scope?: string };
	const name = person ?? LOG_PROJECTS[params.slug!].name;
	return new Response(
		await readRss({ person, scope }, new URL(`/log/${params.slug}/`, site).href, `Of Tomorrow build log — ${name}`),
		{ headers: { 'content-type': 'application/rss+xml; charset=utf-8' } },
	);
};
