import { defineConfig } from '@playwright/test';

const baseURL = process.env.NEOSOUL_E2E_BASE_URL;
if (!baseURL) throw new Error('NEOSOUL_E2E_BASE_URL is required');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
