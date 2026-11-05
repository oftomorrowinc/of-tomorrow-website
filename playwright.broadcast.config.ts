import { defineConfig, devices } from '@playwright/test';

// The OBS pages under broadcast/ (specs/broadcast_001.md). `npm run test:broadcast`.
//
// chromium: the static files opened as file://, the way OBS opens them — no
// build, no server (broadcast.spec.ts, broadcast.src.spec.ts).
// published: broadcast/dist (the build Vercel serves at broadcast.oftomorrow.net)
// over http, its stills compared with card 2's snapshots — the SAME files in
// tests/broadcast.spec.ts-snapshots/, so the published pages are the local ones.
const PORT = 4799;
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } };

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	projects: [
		{ name: 'chromium', testMatch: /broadcast(\.src)?\.spec\.ts$/, use: desktop },
		{
			name: 'published',
			testMatch: /broadcast\.published\.spec\.ts$/,
			use: { ...desktop, baseURL: `http://127.0.0.1:${PORT}/` },
			snapshotPathTemplate: '{testDir}/broadcast.spec.ts-snapshots/{arg}-chromium-{platform}{ext}',
		},
	],
	webServer: {
		command: `node broadcast/build.mjs && PORT=${PORT} node tests/serve-broadcast.mjs`,
		url: `http://127.0.0.1:${PORT}/split.html`,
		reuseExistingServer: false,
	},
});
