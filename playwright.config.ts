import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for dashboard E2E tests.
 *
 * Local usage (two options):
 *
 *   Option A — already have a dev server running (most common during development):
 *     In one terminal:  npm run dev
 *     In another:       npm run test:e2e:ui
 *
 *   Option B — let Playwright start the server automatically:
 *     Prerequisite: run `npm run prebuild` once to generate public/data/ JSON files.
 *     Then just:    npm run test:e2e  OR  npm run test:e2e:ui
 *     Playwright will start `next dev` for you.
 *
 * CI: the dashboard-test.yml workflow builds the app with `npm run build`
 *     and then starts it with `npm start` before running the tests.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// In CI the app is pre-built and started with `next start` by the workflow.
// Locally we use `next dev` so no full build is needed (just npm run prebuild once).
const SERVER_COMMAND = process.env.CI ? 'npm start' : 'npm run dev';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Retry once on flaky failures (e.g. slow ECharts init)
  retries: process.env.CI ? 1 : 0,
  // Run tests sequentially — the app may be slow on CI and we don't want port conflicts
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    // Capture traces on first retry so failures are diagnosable
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: SERVER_COMMAND,
    url: BASE_URL,
    timeout: 120_000,
    // Always reuse an existing server locally (e.g. your already-running `npm run dev`).
    // In CI always start fresh.
    reuseExistingServer: !process.env.CI,
  },
});
