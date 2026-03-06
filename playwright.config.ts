import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: 'tests/artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/artifacts/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'tests/artifacts/junit/results.xml' }],
    ['json', { outputFile: 'tests/artifacts/test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
