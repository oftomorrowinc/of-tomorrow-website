/* The URL contract (specs/broadcast_001.md §3), parsed once and shared by every
   page under broadcast/. A classic script, not a module: OBS (CEF) and Chrome
   refuse module scripts from file:// URLs, and these pages run as local files.

   The dock (dock.html) writes the same param set, as a query string, into
   localStorage under one key (KEY); every page listens for the `storage` event
   and re-renders. One contract: the URL wins on load, the dock after (mount()).

   Exposes window.Broadcast = { params, mount, render helpers }. No colours here — the
   pages colour themselves from magazine.css's custom properties; this file
   only picks WHICH token (the accent) by name. */
(function () {
	'use strict';

	var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var ACCENTS = ['poppy', 'teal', 'mustard'];
	// The segment picks the accent unless `accent=` says otherwise (§3).
	var SEGMENT_ACCENT = { 'field notes': 'teal', 'the ledger': 'mustard', 'ask me anything': 'poppy', ama: 'poppy' };

	function base64urlJson(s) {
		try {
			var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
			while (b64.length % 4) b64 += '=';
			var bin = atob(b64);
			var bytes = new Uint8Array(bin.length);
			for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			var v = JSON.parse(new TextDecoder().decode(bytes));
			return Array.isArray(v) ? v.map(String) : null;
		} catch (e) {
			return null;
		}
	}

	/** "2026-11-04" → "November 2026"; anything else is shown as given. */
	function monthYear(date) {
		var m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(date || '');
		if (!m) return date || '';
		var i = Number(m[2]) - 1;
		return i >= 0 && i < 12 ? MONTHS[i] + ' ' + m[1] : date;
	}

	function intOr(v, d) {
		var n = parseInt(v, 10);
		return isNaN(n) ? d : n;
	}

	/** Parse a query string into the contract's values, with its defaults. */
	function parse(search) {
		var q = new URLSearchParams(search);
		var segment = q.get('segment') || 'Field Notes';
		var accent = q.get('accent');
		var accentGiven = ACCENTS.indexOf(accent) >= 0;
		if (!accentGiven) accent = SEGMENT_ACCENT[segment.toLowerCase()] || 'teal';
		var lines = q.getAll('l');
		if (!lines.length && q.get('list')) lines = base64urlJson(q.get('list')) || [];
		var steps = q.getAll('step');
		var reveal = q.get('reveal');
		return {
			issue: q.get('issue') || '',
			date: q.get('date') || '',
			month: monthYear(q.get('date')),
			host: q.get('host') || 'Todd Sampson',
			segment: segment,
			accent: accent,
			accentGiven: accentGiven,
			title: q.get('title') || '',
			kicker: q.get('kicker') || '',
			sub: q.get('sub') || '',
			n: q.get('n') || '',
			lines: lines,
			// Each line's marker when it is not its position (src= items' `n`).
			ns: [],
			// reveal: how many lines show; absent = all of them.
			reveal: reveal === null ? lines.length : Math.max(0, Math.min(lines.length, intOr(reveal, lines.length))),
			revealAsked: reveal,
			marker: q.get('marker') === 'square' ? 'square' : 'number',
			steps: steps,
			now: Math.max(1, Math.min(steps.length || 1, intOr(q.get('now'), 1))),
			// Steps the feed marked done (src= items' `done`); empty = by `now`.
			done: [],
			// Data (card 4): the list or the progress from a JSON URL, and the
			// read key it is fetched with (sent as Authorization: Bearer).
			src: q.get('src') || '',
			key: q.get('key') || '',
			mode: ['title', 'list', 'progress'].indexOf(q.get('mode')) >= 0 ? q.get('mode') : 'title',
			tile: q.get('tile') === '1',
			theme: q.get('theme') === 'ink' ? 'ink' : 'paper',
			caption: q.get('caption') || '',
			bw: q.get('bw') === '1',
			out: q.get('out') === '1',
			// The lower-third's own fields, so the dock can hold a segment title
			// and a name plate at once; a lower.html URL may use title/sub/n.
			lowerTitle: q.has('lt') ? q.get('lt') : q.get('title') || '',
			lowerSub: q.has('lsub') ? q.get('lsub') : q.get('sub') || '',
			lowerN: q.has('ln') ? q.get('ln') : q.get('n') || '',
		};
	}

	var params = parse(location.search);

	function el(tag, cls, text) {
		var e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = text;
		return e;
	}

	/** The issue line: "Todd Sampson · No. 12 · November 2026", skipping blanks. */
	function issueLine(p) {
		return [p.host, p.issue ? 'No. ' + p.issue : '', p.month].filter(Boolean).join(' · ');
	}

	/** The list split.html and full.html share (§2.3): same markup, same class,
	 *  so the same CSS puts it in the same place in both. Lines newly revealed
	 *  since `prev` (the dock's reveal +) rise 12px and fade in, 220ms (§4);
	 *  lines already showing do not move. */
	function list(p, prev) {
		var from = prev && sameLines(prev, p) ? prev.reveal : p.reveal;
		var ol = el('ol', 'bc-list bc-list--' + p.marker);
		var marks = p.lines.map(function (_, i) { return p.ns[i] != null && p.ns[i] !== '' ? String(p.ns[i]) : String(i + 1); });
		// A card number (src= `n`) is wider than the chip: the chip grows, the
		// same width on every line (tabular figures), so the text stays aligned.
		var widest = Math.max.apply(null, marks.map(function (m) { return m.length; }).concat(0));
		var wide = p.marker === 'number' && widest > 2;
		if (wide) ol.classList.add('bc-list--wide');
		p.lines.forEach(function (text, i) {
			var li = el('li', 'bc-line');
			var mark = el('span', 'bc-marker', p.marker === 'number' ? marks[i] : '');
			// Every chip as wide as the widest number (1ch = one tabular figure).
			if (wide) mark.style.width = 'calc(' + widest + 'ch + 18px)';
			li.appendChild(mark);
			li.appendChild(el('span', 'bc-line-text', text));
			if (i >= p.reveal) li.hidden = true;
			else if (i >= from) li.classList.add('bc-line--in');
			ol.appendChild(li);
		});
		return ol;
	}

	/** A paper matte over the whole frame with transparent holes cut in it
	 *  (the camera tile, the framed window): one SVG path, even-odd fill. */
	function matte(holes) {
		var NS = 'http://www.w3.org/2000/svg';
		var svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'bc-matte');
		svg.setAttribute('width', '1920');
		svg.setAttribute('height', '1080');
		svg.setAttribute('viewBox', '0 0 1920 1080');
		var d = 'M0 0H1920V1080H0Z';
		holes.forEach(function (h) {
			var r = h.r;
			d += 'M' + (h.x + r) + ' ' + h.y + 'H' + (h.x + h.w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (h.x + h.w) + ' ' + (h.y + r) +
				'V' + (h.y + h.h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (h.x + h.w - r) + ' ' + (h.y + h.h) +
				'H' + (h.x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + h.x + ' ' + (h.y + h.h - r) +
				'V' + (h.y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (h.x + r) + ' ' + h.y + 'Z';
		});
		var path = document.createElementNS(NS, 'path');
		path.setAttribute('d', d);
		path.setAttribute('fill-rule', 'evenodd');
		svg.appendChild(path);
		return svg;
	}

	// The camera tile (§2.3): 300×420, radius 24, lower right inside the frame rule.
	var TILE = { x: 1920 - 72 - 300, y: 1080 - 72 - 420, w: 300, h: 420, r: 24 };

	/** The tile's border and shadow, drawn over the matte's hole. */
	function tile() {
		var t = el('div', 'bc-tile');
		t.style.left = TILE.x + 'px';
		t.style.top = TILE.y + 'px';
		t.style.width = TILE.w + 'px';
		t.style.height = TILE.h + 'px';
		return t;
	}

	/** Set the accent and theme on <html>, so CSS resolves --accent to one token. */
	function apply(p) {
		var root = document.documentElement;
		root.dataset.accent = p.accent;
		root.dataset.theme = p.theme;
	}

	function sameLines(a, b) {
		return a.lines.length === b.lines.length && a.lines.every(function (l, i) { return l === b.lines[i]; });
	}

	// ---- the dock's channel ------------------------------------------------

	/** The one localStorage key the dock writes and every page reads. */
	var KEY = 'oftomorrow.broadcast.params';
	/** The params the dock owns. Once the dock writes, these come from it; the
	 *  rest (mode, tile, caption, bw, marker, host) stay per page, from its URL —
	 *  three full.html scenes can be title, list and progress at once. */
	var DOCK_KEYS = ['segment', 'accent', 'issue', 'date', 'kicker', 'title', 'l', 'list', 'reveal', 'step', 'now', 'lt', 'lsub', 'ln', 'out', 'theme'];
	// l and list= are one value (the lines); a page given either drops the other.
	var GROUPS = { l: ['l', 'list'], list: ['l', 'list'] };

	/** `top`'s values over `base`'s, for `keys` (default: the keys top has). */
	function overlay(base, top, keys) {
		var b = new URLSearchParams(base);
		var t = new URLSearchParams(top);
		var ks = keys || Array.from(new Set(Array.from(t.keys())));
		ks.forEach(function (k) {
			(GROUPS[k] || [k]).forEach(function (g) { b.delete(g); });
		});
		var out = new URLSearchParams();
		b.forEach(function (v, k) { out.append(k, v); });
		t.forEach(function (v, k) { if (ks.indexOf(k) >= 0) out.append(k, v); });
		return out.toString();
	}

	function stored() {
		try {
			return localStorage.getItem(KEY) || '';
		} catch (e) {
			return '';
		}
	}

	// ---- src= (card 4): the list or the progress from a JSON URL ------------

	/** The feed's JSON, checked against the one shape (spec §3, card 4):
	 *  { title, kicker?, items: [{ text, n?, done? }], now? }. null if not. */
	function feedShape(v) {
		if (!v || typeof v !== 'object' || !Array.isArray(v.items)) return null;
		var items = [];
		for (var i = 0; i < v.items.length; i++) {
			var it = v.items[i];
			if (!it || typeof it.text !== 'string') return null;
			items.push({ text: it.text, n: it.n == null || it.n === '' ? null : String(it.n), done: it.done === true });
		}
		var now = v.now == null ? NaN : parseInt(v.now, 10);
		return {
			title: typeof v.title === 'string' ? v.title : '',
			kicker: typeof v.kicker === 'string' ? v.kicker : '',
			items: items,
			now: isNaN(now) ? null : now,
		};
	}

	/** Fetch `src`, with the read key (if any) as Authorization: Bearer — the
	 *  ledger's API-key shape, and it keeps the key out of the feed's URL. */
	function fetchSource(src, key) {
		var headers = { Accept: 'application/json' };
		if (key) headers.Authorization = 'Bearer ' + key;
		var ctl = typeof AbortController === 'function' ? new AbortController() : null;
		var timer = ctl && setTimeout(function () { ctl.abort(); }, 8000);
		return fetch(src, { headers: headers, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
			.then(function (r) {
				if (!r.ok) throw new Error('src= answered ' + r.status);
				return r.json();
			})
			.then(function (v) {
				var d = feedShape(v);
				if (!d) throw new Error('src= is not { title, items: [{ text }] }');
				return d;
			})
			.finally(function () { if (timer) clearTimeout(timer); });
	}

	/** p with the feed's content in place of the typed list and steps. The
	 *  feed is the content: it beats the dock's title, lines, steps and now; the
	 *  page's own URL title/kicker beat the feed's; reveal (URL or dock) still
	 *  counts lines, all of them when absent. */
	function withSource(p, d, own) {
		var texts = d.items.map(function (t) { return t.text; });
		p.lines = texts;
		p.ns = d.items.map(function (t) { return t.n; });
		p.steps = texts;
		// done counts only when the feed marks some: else steps go by `now`.
		var anyDone = d.items.some(function (t) { return t.done; });
		p.done = anyDone ? d.items.map(function (t) { return t.done; }) : [];
		if (own.indexOf('title') < 0 && d.title) p.title = d.title;
		if (own.indexOf('kicker') < 0 && d.kicker) p.kicker = d.kicker;
		p.reveal = p.revealAsked === null ? texts.length : Math.max(0, Math.min(texts.length, intOr(p.revealAsked, texts.length)));
		// now: the feed's; else the first step not done; all done = none current.
		var now = d.now;
		if (now === null) {
			now = anyDone ? p.done.indexOf(false) + 1 : 1;
			if (now === 0) now = texts.length + 1;
		}
		p.now = Math.max(1, Math.min(texts.length + 1, now));
		return p;
	}

	/** A step's state on full.html mode=progress: the feed's `done` if it gave
	 *  one, else by its place before or after `now`. */
	function stepState(p, i) {
		if (p.done.length) return p.done[i] ? 'done' : i + 1 === p.now ? 'now' : 'next';
		return i + 1 < p.now ? 'done' : i + 1 === p.now ? 'now' : 'next';
	}

	/** Render a page now, and again whenever the dock writes. On load the dock's
	 *  last state fills in and the URL's own keys win over it; after load each
	 *  dock write wins for the keys it owns. render(p, prev): prev is null on
	 *  the first call, so nothing animates on load except what a page says.
	 *
	 *  opts.src: the page takes `src=` (split, full). Its first draw waits for
	 *  the feed (or its failure: then the URL's own content shows, and
	 *  <html data-src="failed">); every draw after uses the feed's content. */
	function mount(render, opts) {
		var url = location.search.replace(/^\?/, '');
		var prev = null;
		var data = null;
		// A lower.html URL's title/sub/n beat the dock's stored lt/lsub/ln too.
		var mine = Array.from(new URLSearchParams(url).keys());
		[['title', 'lt'], ['sub', 'lsub'], ['n', 'ln']].forEach(function (a) {
			if (mine.indexOf(a[0]) >= 0 && mine.indexOf(a[1]) < 0) mine.push(a[1]);
		});
		var ready = false;
		var pending = null;
		function draw(query) {
			if (!ready) {
				pending = query;
				return;
			}
			var p = parse(query);
			if (data) withSource(p, data, mine);
			apply(p);
			render(p, prev);
			prev = p;
			window.Broadcast.params = p;
		}
		window.addEventListener('storage', function (e) {
			if (e.key !== KEY || e.newValue == null) return;
			draw(overlay(url, e.newValue, DOCK_KEYS));
		});
		var first = overlay(stored(), url, mine);
		// src and key are the page's own, from its URL, never the dock's.
		var own = parse(url);
		if (!(opts && opts.src && own.src)) {
			ready = true;
			draw(first);
			return;
		}
		var root = document.documentElement;
		root.dataset.src = 'loading';
		fetchSource(own.src, own.key)
			.then(function (d) {
				data = d;
				root.dataset.src = 'loaded';
			}, function (err) {
				console.warn('[broadcast] ' + (err && err.message ? err.message : err) + ' — showing the URL\'s own content');
				root.dataset.src = 'failed';
			})
			.then(function () {
				ready = true;
				draw(pending || first);
			});
	}

	window.Broadcast = { feedShape: feedShape, withSource: withSource, stepState: stepState, KEY: KEY, DOCK_KEYS: DOCK_KEYS, overlay: overlay, mount: mount, parse: parse, params: params, monthYear: monthYear, issueLine: issueLine, el: el, list: list, matte: matte, tile: tile, TILE: TILE, apply: apply };
})();
