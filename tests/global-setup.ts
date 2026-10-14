// The blog's content collection, for Vitest. The Container API reads
// collections from the content layer's data store, which `astro dev` keeps in
// .astro/ and `astro build`/`astro sync` write to node_modules/.astro/. Vitest
// runs Vite as a dev server, so it looks in .astro/: sync, and put it there.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';

export default function setup() {
	execFileSync('node_modules/.bin/astro', ['sync'], { stdio: 'ignore' });
	mkdirSync('.astro', { recursive: true });
	copyFileSync('node_modules/.astro/data-store.json', '.astro/data-store.json');
}
