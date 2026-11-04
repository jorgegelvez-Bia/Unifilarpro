import { defineConfig, devices } from '@playwright/test';

/** Pruebas en navegador real (Chromium). Correr: npm run test:e2e */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  // En GitHub, 'github' muestra el error como anotación en la página de la corrida.
  reporter: process.env.CI ? [['github'], ['list']] : 'line',
  use: { baseURL: 'http://localhost:5299', ...devices['Desktop Chrome'] },
  webServer: [
    {
      // App en modo desarrollo (sin nube).
      command: 'npx vite --port 5299 --strictPort',
      url: 'http://localhost:5299/e2e/harness.html',
      reuseExistingServer: !process.env.CI,
    },
    {
      // App con la nube apuntando a una Supabase de mentira (las pruebas responden por ella).
      command: 'npx vite --port 5300 --strictPort',
      url: 'http://localhost:5300/',
      reuseExistingServer: !process.env.CI,
      env: { VITE_SUPABASE_URL: 'http://supabase.test', VITE_SUPABASE_ANON_KEY: 'clave-publica-de-prueba' },
    },
    {
      // App ya construida (como en el celular): para probar que abre sin internet.
      command: 'npx vite build && npx vite preview --port 4299 --strictPort',
      url: 'http://localhost:4299/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
