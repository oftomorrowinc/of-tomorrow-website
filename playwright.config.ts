import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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