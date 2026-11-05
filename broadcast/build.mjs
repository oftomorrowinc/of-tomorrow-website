// broadcast.oftomorrow.net (specs/broadcast_001.md §5 card 4): the OBS pages as
// a static site. Vercel runs this with broadcast/ as the project's Root
// Directory (broadcast/vercel.json); `npm run broadcast:build` runs it here.
//
// broadcast/dist/ = the pages, params.js, broadcast.css and fonts/ as they are,
// plus magazine.css beside them: the pages' one `../src/styles/magazine.css`
// link becomes `magazine.css`, the only change, so the hosted pages are the
// local ones (tests/broadcast.published.spec.ts compares their pixels to card
// 2's snapshots). No dependencies: Vercel needs no install for it.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist');
const MAGAZINE = '../src/styles/magazine.css';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const pages = [];
for (const f of readdirSync(here)) {
	if (f.endsWith('.html')) {
		const html = readFileSync(join(here, f), 'utf8');
		if (!html.includes(MAGAZINE)) throw new Error(`${f} does not link ${MAGAZINE}`);
		writeFileSync(join(out, f), html.replaceAll(`href="${MAGAZINE}"`, 'href="magazine.css"'));
		pages.push(f);
	} else if (f.endsWith('.css') || f === 'params.js') {
		cpSync(join(here, f), join(out, f));
	}
}
cpSync(join(here, 'fonts'), join(out, 'fonts'), { recursive: true });
cpSync(join(here, '..', 'src', 'styles', 'magazine.css'), join(out, 'magazine.css'));

console.log(`broadcast/dist: ${pages.sort().join(' ')} + params.js, broadcast.css, magazine.css, fonts/`);
