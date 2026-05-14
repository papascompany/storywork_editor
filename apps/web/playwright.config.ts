/**
 * apps/web/playwright.config.ts
 *
 * Production URL 대상 e2e 통합 검증.
 * 두 도메인(web/admin) 의 라우팅·가드·핵심 폼 동작을 한 세션에서 검증.
 *
 * 환경변수:
 * - WEB_BASE_URL  (default: https://storywork-editor-web.vercel.app)
 * - ADMIN_BASE_URL (default: https://storywork-editor-admin.vercel.app)
 *
 * 실행: pnpm --filter @storywork/web exec playwright test
 */
import { defineConfig, devices } from '@playwright/test'

const WEB_BASE_URL = process.env['WEB_BASE_URL'] ?? 'https://storywork-editor-web.vercel.app'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: WEB_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1200 } },
    },
  ],
})
