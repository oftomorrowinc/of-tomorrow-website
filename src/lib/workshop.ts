// FROM THE WORKSHOP: the newest posts on todd.oftomorrow.net, read at BUILD
// time. The browser never fetches the feed. If the feed is unreachable or
// unreadable the build goes on with two static links and says so in the log.

export const WORKSHOP_URL = 'https://todd.oftomorrow.net';
const FEED_URL = `${WORKSHOP_URL}/rss.xml`;

export interface WorkshopPost {
	title: string;
	link: string;
	description: string;
	pubDate?: Date;
}

export const FALLBACK: WorkshopPost[] = [
	{
		title: 'The rule I wrote and then broke',
		link: `${WORKSHOP_URL}/blog/the-rule-i-wrote-and-then-broke/`,
		description: 'From the vault: eight rules for 2023, and the one about shipping.',
	},
	{
		title: 'BYOLLM is open source',
		link: `${WORKSHOP_URL}/blog/byollm-is-open-source/`,
		description: 'Bring Your Own LLM: your own AI on the websites you authorize.',
	},
];

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(s: string): string {
	return s
		.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
		.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e])
		.trim();
}

function tag(item: string, name: string): string {
	const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
	return m ? decode(m[1]) : '';
}

export function parseFeed(xml: string): WorkshopPost[] {
	return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
		.map(([, item]) => {
			const date = tag(item, 'pubDate');
			return {
				title: tag(item, 'title'),
				link: tag(item, 'link'),
				description: tag(item, 'description'),
				pubDate: date ? new Date(date) : undefined,
			};
		})
		.filter((p) => p.title && p.link.startsWith('https://'))
		.sort((a, b) => (b.pubDate?.valueOf() ?? 0) - (a.pubDate?.valueOf() ?? 0));
}

let cached: Promise<WorkshopPost[]> | undefined;

export function latestWorkshopPosts(count = 2): Promise<WorkshopPost[]> {
	cached ??= (async () => {
		try {
			const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(10_000) });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const posts = parseFeed(await res.text());
			if (posts.length === 0) throw new Error('no items in the feed');
			console.log(`[workshop] ${FEED_URL}: ${posts.length} items`);
			return posts;
		} catch (err) {
			console.warn(
				`[workshop] ${FEED_URL} unreachable (${(err as Error).message}); using the two static fallback links`,
			);
			return FALLBACK;
		}
	})();
	return cached.then((posts) => posts.slice(0, count));
}
