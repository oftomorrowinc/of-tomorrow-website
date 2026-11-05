// The blog's content collection, for Vitest. The Container API reads
// collections from the content layer's data store, which `astro dev` keeps in
// .astro/ and `astro build`/`astro sync` write to node_modules/.astro/. Vitest
// runs Vite as a dev server, so it looks in .astro/: sync, and put it there.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';

export default function setup() {
	try {
		execFileSync('node_modules/.bin/astro', ['sync'], { stdio: 'pipe' });
	} catch (err) {
		// A story that breaks a fence (src/lib/today.ts, in the schema) fails here: say which, and why.
		const out = `${(err as { stdout?: Buffer }).stdout ?? ''}${(err as { stderr?: Buffer }).stderr ?? ''}`;
		const why = out.split('\n').filter((l) => /InvalidContentEntryDataError|^\s+\*\*\*\*:|does not match/.test(l));
		throw new Error(`astro sync failed:\n${(why.length ? why : out.split('\n').slice(-20)).join('\n')}`);
	}
	mkdirSync('.astro', { recursive: true });
	copyFileSync('node_modules/.astro/data-store.json', '.astro/data-store.json');
}
