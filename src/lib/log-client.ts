// The build log in the browser: the live line, and whatever is newer than the
// build. A static page that only showed what it was built with would be hours
// stale and still look live; this asks the feed on load and every minute.

import { entryHtml, groupByDay, liveHtml, queryUrl, type LinkContext, type LogPage } from './log';

const POLL_MS = 60_000;

function context(el: HTMLElement): LinkContext {
	return {
		people: (el.dataset.people ?? '').split(',').filter(Boolean),
		projects: (el.dataset.projects ?? '').split(',').filter(Boolean),
	};
}

async function read(el: HTMLElement, q: { since?: number; limit: number }): Promise<LogPage | null> {
	try {
		const url = queryUrl(el.dataset.feed!, {
			scope: el.dataset.scope || undefined,
			person: el.dataset.person || undefined,
			live: true,
			...q,
		});
		const res = await fetch(url);
		return res.ok ? ((await res.json()) as LogPage) : null;
	} catch {
		return null;
	}
}

/** Absent, not "idle", when nothing is claimed. */
function showLive(el: HTMLElement, page: LogPage) {
	const live = el.querySelector<HTMLElement>('[data-live]');
	if (!live) return;
	const lines = page.live ?? [];
	live.innerHTML = liveHtml(lines);
	live.hidden = lines.length === 0;
}

function every(tick: () => Promise<void>) {
	void tick();
	setInterval(() => {
		if (document.visibilityState === 'visible') void tick();
	}, POLL_MS);
}

/** /log and its pages: new entries go on top, into today's day or a new one. */
export function startStream(el: HTMLElement) {
	const ctx = context(el);
	let since = Number(el.dataset.since ?? 0);
	const days = el.querySelector<HTMLElement>('[data-days]')!;
	every(async () => {
		const page = await read(el, { since, limit: 200 });
		if (!page) return;
		showLive(el, page);
		const fresh = page.entries.filter((e) => e.seq > since && !document.getElementById(`e${e.seq}`));
		if (fresh.length === 0) return;
		el.querySelector('[data-empty]')?.remove();
		// Oldest first, each prepended, so the newest ends on top.
		for (const group of groupByDay(fresh).reverse()) {
			let day = days.querySelector<HTMLElement>(`[data-day="${group.day}"]`);
			if (!day) {
				day = document.createElement('section');
				day.className = 'log-day';
				day.dataset.day = group.day;
				day.dataset.testid = 'log-day';
				day.innerHTML = `<h2 class="log-day-label"></h2><ol class="log-entries"></ol>`;
				day.querySelector('h2')!.textContent = group.label;
				days.prepend(day);
			}
			const list = day.querySelector('ol')!;
			for (const e of [...group.entries].reverse()) {
				const li = document.createElement('li');
				li.id = `e${e.seq}`;
				li.className = 'log-entry log-new';
				li.dataset.testid = 'log-entry';
				li.dataset.seq = String(e.seq);
				li.innerHTML = entryHtml(e, ctx);
				list.prepend(li);
			}
		}
		since = Math.max(since, ...fresh.map((e) => e.seq));
	});
}

/** The homepage strip: the newest five, redrawn when the feed has newer. */
export function startStrip(el: HTMLElement) {
	const ctx = context(el);
	const count = Number(el.dataset.count ?? 5);
	let newest = Number(el.dataset.since ?? 0);
	const list = el.querySelector<HTMLElement>('[data-entries]')!;
	every(async () => {
		const page = await read(el, { limit: count });
		if (!page) return;
		showLive(el, page);
		const top = page.entries[0]?.seq ?? 0;
		if (top <= newest) return;
		newest = top;
		list.innerHTML = page.entries
			.slice(0, count)
			.map((e) => `<li class="log-entry" data-testid="strip-entry" data-seq="${e.seq}">${entryHtml(e, ctx, { body: false, href: `/log#e${e.seq}` })}</li>`)
			.join('');
	});
}
