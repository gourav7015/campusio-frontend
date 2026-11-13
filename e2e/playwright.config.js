import { defineConfig } from '@playwright/test';

/**
 * `npm run e2e` starts a throw-away demo API (from the backend repository) (in-memory MongoDB + a populated school) and the web dev server,
 * then drives real Chromium through every portal. Each run starts from a fresh database.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.WEB_URL || 'http://localhost:5173', actionTimeout: 15_000, headless: true, viewport: { width: 1360, height: 900 }, trace: 'retain-on-failure' },
  outputDir: process.env.E2E_OUT || './test-results',
  webServer: process.env.WEB_URL ? undefined : [
    // the backend is a separate repository: check it out next to this one (../backend) or set BACKEND_DIR
    { command: 'npm run demo', cwd: process.env.BACKEND_DIR || '../../backend', wait: { stdout: /Demo ready/ }, timeout: 240_000, reuseExistingServer: false },
    { command: 'npm run dev', cwd: '..', url: 'http://localhost:5173', timeout: 60_000, reuseExistingServer: true },
  ],
});
