// /today.xml (specs/news_001.md §6): the stories as RSS, newest first, from the
// same collection the strip and /today read. Each item links to its story on
// /today; the body is the description. Channel copy is frame copy (§5.5),
// pending Todd's okay with the rest (README.md).
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { authorLabel, newestFirst, PROJECT_LABEL, slugOf, TODAY_FEED } from '../lib/today';

export async function GET(context: APIContext) {
	const stories = newestFirst(await getCollection('today'));
	return rss({
		title: TODAY_FEED.title,
		description: TODAY_FEED.description,
		site: context.site!,
		trailingSlash: false,
		items: stories.map((s) => ({
			title: s.data.title,
			description: s.data.body,
			pubDate: s.data.date,
			link: `/today#${slugOf(s.id)}`,
			categories: [PROJECT_LABEL[s.data.project]],
			customData: `<dc:creator>${authorLabel(s.data.author)}</dc:creator>`,
		})),
		xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
	});
}
