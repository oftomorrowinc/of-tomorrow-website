/// <reference types="vitest/config" />
// The unit harness: pages and components rendered to strings with Astro's
// Container API, against the fixture feeds (tests/setup.ts). No server, no
// browser — tests/browser.spec.ts (Playwright) holds what needs one.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		globalSetup: ['tests/global-setup.ts'],
		setupFiles: ['tests/setup.ts'],
		// The build's own progress lines ([log] …, [workshop] …) are not test output.
		onConsoleLog: (line) => !/^\[(log|workshop)\] /.test(line),
	},
});
