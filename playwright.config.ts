import { defineConfig, devices } from '@playwright/test';

// Only the things a browser alone can prove (tests/browser.spec.ts); the
// markup is under Vitest (`npm test`). This runs at landing, in `npm run verify`.
export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Not 'html': on a failure it serves the report and waits, and a gate that waits is a hung landing.
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4399',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // The tests run against the build, not the dev server: `astro dev` injects
  // its toolbar (extra h1s) into every page. The build reads the build log
  // from a fixture feed (tests/fixtures/log-feed.mjs), started first.
  webServer: [
    {
      command: 'node tests/fixtures/log-feed.mjs',
      url: 'http://localhost:4398/api/log',
      reuseExistingServer: false,
    },
    {
      command: 'LOG_FEED_URL=http://localhost:4398/api/log npm run build && npm run preview -- --port 4399',
      url: 'http://localhost:4399',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});