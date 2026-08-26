import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for MCT IT Portal.
 *
 * - Starts the backend (port 3001) and frontend (port 3000) automatically
 * - Uses Chromium headless for CI-friendly testing
 * - Tests run sequentially to avoid port conflicts
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && JWT_SECRET=test-e2e-secret-32-chars-minimum NODE_ENV=test node src/index.js',
      port: 3001,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
