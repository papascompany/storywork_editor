/**
 * perf-admin-save-auth.ts — admin 로그인 후 storage state 저장
 *
 * perf-admin-measure.ts 가 인증 없이는 보호 페이지를 측정할 수 없으므로
 * 한 번 수동으로 로그인해 Playwright storage state 를 저장한다.
 *
 * 실행:
 *   pnpm perf:admin:save-auth
 *   tsx --tsconfig tsconfig.scripts.json scripts/perf-admin-save-auth.ts [options]
 *
 * 옵션:
 *   --env <local|prod>        기본 local
 *   --output <path>           저장 경로 (기본 tmp/perf/admin-auth.json)
 *   --email <email>           이메일 (없으면 환경변수 PERF_ADMIN_EMAIL)
 *   --password <password>     비밀번호 (없으면 환경변수 PERF_ADMIN_PASSWORD)
 *
 * 주의:
 *   - 이 스크립트는 headed 모드로 실행돼 브라우저 창이 열립니다.
 *   - 저장된 state 파일은 .gitignore 에 의해 커밋되지 않습니다 (tmp/ 제외됨).
 *   - 비밀번호를 커맨드 인자로 전달 시 shell history 에 남을 수 있습니다.
 *     환경변수 PERF_ADMIN_EMAIL / PERF_ADMIN_PASSWORD 사용을 권장합니다.
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

interface PlaywrightModule {
  chromium: {
    launch(opts: { headless: boolean }): Promise<BrowserHandle>
  }
}

interface BrowserHandle {
  newContext(opts: {
    viewport: { width: number; height: number }
    locale?: string
  }): Promise<ContextHandle>
  close(): Promise<void>
}

interface ContextHandle {
  newPage(): Promise<PageHandle>
  storageState(opts: { path: string }): Promise<void>
  close(): Promise<void>
}

interface PageHandle {
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  waitForURL(pattern: RegExp | string, opts?: { timeout?: number }): Promise<void>
  fill(selector: string, value: string): Promise<void>
  click(selector: string): Promise<void>
  waitForSelector(selector: string, opts?: { timeout?: number }): Promise<unknown>
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  const candidates = [
    path.resolve(process.cwd(), 'node_modules/@playwright/test/index.js'),
    path.resolve(process.cwd(), 'apps/web/node_modules/@playwright/test/index.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const mod = (await import(candidate)) as PlaywrightModule & { default?: PlaywrightModule }
      return mod.chromium ? mod : (mod.default as PlaywrightModule)
    }
  }
  throw new Error('@playwright/test 를 찾을 수 없습니다.')
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  const envRaw = get('--env') ?? 'local'
  if (envRaw !== 'local' && envRaw !== 'prod') {
    console.error('--env 는 "local" 또는 "prod" 만 허용')
    process.exit(1)
  }

  const BASE_URLS: Record<string, string> = {
    local: 'http://localhost:3001',
    prod: 'https://storywork-editor-admin.vercel.app',
  }

  return {
    env: envRaw as 'local' | 'prod',
    baseUrl: BASE_URLS[envRaw],
    outputPath: get('--output') ?? path.resolve(process.cwd(), 'tmp/perf/admin-auth.json'),
    email: get('--email') ?? process.env['PERF_ADMIN_EMAIL'] ?? '',
    password: get('--password') ?? process.env['PERF_ADMIN_PASSWORD'] ?? '',
  }
}

async function main(): Promise<void> {
  const args = parseArgs()
  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true })

  if (!args.email || !args.password) {
    console.log('이메일/비밀번호가 없습니다. 브라우저 창에서 수동으로 로그인하세요.')
    console.log('(환경변수 PERF_ADMIN_EMAIL / PERF_ADMIN_PASSWORD 로 자동 입력 가능)')
    console.log('')
  }

  const pw = await loadPlaywright()
  const browser = await pw.chromium.launch({ headless: false })

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ko-KR',
    })
    const page = await context.newPage()

    console.log(`[save-auth] 로그인 페이지 이동: ${args.baseUrl}/login`)
    await page.goto(`${args.baseUrl}/login`, { waitUntil: 'networkidle', timeout: 30_000 })

    if (args.email && args.password) {
      // 자동 로그인
      console.log(`[save-auth] 자동 로그인: ${args.email}`)
      await page.fill('input[type="email"]', args.email)
      await page.fill('input[type="password"]', args.password)
      await page.click('button[type="submit"]')

      // 로그인 후 대시보드로 이동 대기 (최대 15초)
      try {
        await page.waitForURL(/\/(audit|resources|templates|formats|\s*$)/, { timeout: 15_000 })
        console.log('[save-auth] 로그인 성공')
      } catch {
        console.warn(
          '[save-auth] 자동 로그인 후 URL 변경 감지 실패. 수동 로그인 후 Enter 를 누르세요.',
        )
        await page.waitForTimeout(10_000)
      }
    } else {
      // 수동 로그인 대기 (최대 3분)
      console.log('[save-auth] 브라우저 창에서 로그인 후 대시보드 진입까지 대기 중... (최대 3분)')
      try {
        await page.waitForURL(/\/(audit|resources|templates|formats|\s*$)/, { timeout: 180_000 })
        console.log('[save-auth] 로그인 성공 감지')
      } catch {
        console.warn('[save-auth] URL 변경 감지 타임아웃. 현재 상태로 저장합니다.')
      }
    }

    // state 저장
    await context.storageState({ path: args.outputPath })
    console.log(`[save-auth] storage state 저장 완료: ${args.outputPath}`)
    console.log('')
    console.log('이제 측정 스크립트를 실행할 수 있습니다:')
    console.log('  pnpm perf:admin')

    await context.close()
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  console.error('[save-auth] 오류:', String(err))
  process.exit(1)
})
