import { defineConfig, devices } from '@playwright/test';

// The OBS pages under broadcast/ (specs/broadcast_001.md): static files, opened
// as file:// the way OBS opens them — no build, no server. `npm run test:broadcast`.
export default defineConfig({
	testDir: './tests',
	testMatch: 'broadcast.spec.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }],
});
