import { defineConfig, devices } from '@playwright/test';

/** Pruebas en navegador real (Chromium). Correr: npm run test:e2e */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  reporter: process.env.CI ? 'list' : 'line',
  use: { baseURL: 'http://localhost:5299', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npx vite --port 5299 --strictPort',
    url: 'http://localhost:5299/e2e/harness.html',
    reuseExistingServer: !process.env.CI,
  },
});
