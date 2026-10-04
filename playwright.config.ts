// Pruebas de principio a fin del panel /admin en modo demostración, sobre la
// web ya compilada (npm run build con BASE_PATH=/siente).
import { defineConfig } from '@playwright/test';

const PUERTO = Number(process.env.PUERTO ?? 4400);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}/siente/`,
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // En local, el Chrome instalado; en GitHub Actions, el Chromium de Playwright.
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx astro preview --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}/siente/admin/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { BASE_PATH: '/siente', SITE_URL: 'https://gaepmalaga.github.io' },
  },
});
