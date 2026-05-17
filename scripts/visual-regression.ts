/**
 * visual-regression.ts — Playwright 기반 배치 시각 회귀 비교기 (DESIGN-04)
 *
 * 전략: 옵션 B — Playwright toHaveScreenshot() 기반
 *   - 폰트 안티앨리어싱 노이즈를 Playwright 내장 threshold 로 흡수
 *   - 전체 페이지 캡처 후 픽셀 단위 비교 (폰트 제외한 spacing/layout/색상 회귀 검출)
 *   - baseline 모드(--update): snapshots/ PNG 생성/갱신
 *   - compare 모드(기본): 기존 snapshot 과 비교 → diff > threshold 시 exit 1
 *
 * 실행:
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/visual-regression.ts [options]
 *
 * 옵션:
 *   --update           baseline 모드 — snapshot 갱신 (의도적 UI 변경 시)
 *   --threshold <n>    픽셀 diff 허용 비율 (0..1, 기본 0.15 = 15%)
 *   --max-diff-ratio <n>  전체 픽셀 중 diff 픽셀 허용 비율 (기본 0.05 = 5%)
 *   --filter <regex>   특정 페이지 이름만 실행 (예: "web-login|admin-403")
 *   --only-web         web 페이지만 실행
 *   --only-admin       admin 페이지만 실행
 *   --help             이 도움말
 *
 * 환경변수:
 *   VISUAL_REGRESSION_UPDATE=1   --update 와 동일
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(import.meta.dirname ?? process.cwd(), '..')
const SNAPSHOT_DIR = path.join(REPO_ROOT, 'tests/visual-regression/snapshots')

// 페이지 정의
interface PageDef {
  name: string // 파일명 prefix (예: web-login)
  port: number // dev 서버 포트
  route: string // 라우트 경로
  device: 'desktop' | 'mobile' // 뷰포트
  waitForSelector?: string // 이 selector 가 출현할 때까지 대기
  skip?: string // 이유가 있을 때만 스킵 (인증 필요 등)
}

// desktop = 1280x900, mobile = 390x844
const DEVICE_PRESETS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

const PAGES: PageDef[] = [
  // ── web ──────────────────────────────────────────────────────────
  {
    name: 'web-login-desktop',
    port: 3000,
    route: '/login',
    device: 'desktop',
    waitForSelector: 'form',
  },
  {
    name: 'web-login-mobile',
    port: 3000,
    route: '/login',
    device: 'mobile',
    waitForSelector: 'form',
  },
  {
    name: 'web-forgot-password-desktop',
    port: 3000,
    route: '/forgot-password',
    device: 'desktop',
    waitForSelector: 'form',
  },
  {
    name: 'web-forgot-password-mobile',
    port: 3000,
    route: '/forgot-password',
    device: 'mobile',
    waitForSelector: 'form',
  },
  {
    name: 'web-auth-reset-password-desktop',
    port: 3000,
    route: '/auth/reset-password',
    device: 'desktop',
    // token 없이 접근 시 error state 렌더됨 (form 없음) → h1 로 대기
    waitForSelector: 'h1',
  },
  {
    name: 'web-auth-reset-password-mobile',
    port: 3000,
    route: '/auth/reset-password',
    device: 'mobile',
    waitForSelector: 'h1',
  },
  {
    name: 'web-editor-desktop',
    port: 3000,
    route: '/editor',
    device: 'desktop',
    // FormatPickerModal 이 자동 표시됨 (dismissable=false)
    waitForSelector: '[role="dialog"]',
  },
  {
    name: 'web-editor-mobile',
    port: 3000,
    route: '/editor',
    device: 'mobile',
    waitForSelector: '[role="dialog"]',
  },
  // ── admin ─────────────────────────────────────────────────────────
  {
    name: 'admin-login-desktop',
    port: 3001,
    route: '/login',
    device: 'desktop',
    waitForSelector: 'form',
  },
  {
    name: 'admin-login-mobile',
    port: 3001,
    route: '/login',
    device: 'mobile',
    waitForSelector: 'form',
  },
  {
    name: 'admin-403-desktop',
    port: 3001,
    route: '/403',
    device: 'desktop',
  },
  {
    name: 'admin-403-mobile',
    port: 3001,
    route: '/403',
    device: 'mobile',
  },
  // admin nav (미인증 → /login redirect) — redirect 된 /login 을 캡처
  {
    name: 'admin-nav-unauth-desktop',
    port: 3001,
    route: '/',
    device: 'desktop',
    // 미인증 시 /login 으로 redirect → form 출현 대기
    waitForSelector: 'form',
  },
  {
    name: 'admin-nav-unauth-mobile',
    port: 3001,
    route: '/',
    device: 'mobile',
    waitForSelector: 'form',
  },
]

// ── Playwright 동적 import (visual-check.ts 와 동일 패턴) ────────────────────

interface PageHandle {
  on(event: string, handler: (msg: { type(): string; text(): string }) => void): void
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  waitForURL(pattern: string | RegExp, opts?: { timeout?: number }): Promise<void>
  url(): string
  emulateMedia(opts: { media: string }): Promise<void>
  screenshot(opts: {
    path?: string
    fullPage?: boolean
    animations?: 'disabled' | 'allow'
    mask?: unknown[]
    threshold?: number
    maxDiffPixelRatio?: number
  }): Promise<Buffer>
  locator(selector: string): {
    waitFor(opts?: { timeout?: number; state?: string }): Promise<void>
    screenshot(opts?: { path?: string }): Promise<Buffer>
  }
}

interface ContextHandle {
  newPage(): Promise<PageHandle>
  close(): Promise<void>
}

interface BrowserHandle {
  newContext(opts: {
    viewport: { width: number; height: number }
    locale?: string
  }): Promise<ContextHandle>
  close(): Promise<void>
}

interface PlaywrightModule {
  chromium: {
    launch(opts: { headless: boolean }): Promise<BrowserHandle>
  }
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  const candidates = [
    path.resolve(REPO_ROOT, 'node_modules/@playwright/test/index.js'),
    path.resolve(REPO_ROOT, 'apps/web/node_modules/@playwright/test/index.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const mod = (await import(candidate)) as PlaywrightModule & { default?: PlaywrightModule }
      return mod.chromium ? mod : (mod.default as PlaywrightModule)
    }
  }
  throw new Error(
    '@playwright/test 를 찾을 수 없습니다.\n' +
      '  pnpm install 후 다시 시도하거나,\n' +
      '  apps/web 에 @playwright/test 가 설치되어 있는지 확인하세요.',
  )
}

// ── pixelmatch + pngjs 동적 import ────────────────────────────────────────────

interface PixelmatchFn {
  (
    img1: Uint8Array | Buffer,
    img2: Uint8Array | Buffer,
    output: Uint8Array | null,
    width: number,
    height: number,
    opts?: { threshold?: number; includeAA?: boolean },
  ): number
}

interface PngjsModule {
  PNG: {
    sync: {
      read(buffer: Buffer): { width: number; height: number; data: Buffer }
    }
  }
}

async function loadPixelmatch(): Promise<{ pixelmatch: PixelmatchFn; PNG: PngjsModule['PNG'] }> {
  const pmCandidates = [
    path.resolve(REPO_ROOT, 'node_modules/pixelmatch/index.js'),
    path.resolve(REPO_ROOT, 'apps/web/node_modules/pixelmatch/index.js'),
  ]
  const pngCandidates = [
    path.resolve(REPO_ROOT, 'node_modules/pngjs/lib/png.js'),
    path.resolve(REPO_ROOT, 'packages/editor-export/node_modules/pngjs/lib/png.js'),
  ]

  let pixelmatch: PixelmatchFn | null = null
  for (const candidate of pmCandidates) {
    if (fs.existsSync(candidate)) {
      const mod = (await import(candidate)) as { default?: PixelmatchFn } | PixelmatchFn
      pixelmatch = (
        typeof mod === 'function' ? mod : (mod as { default?: PixelmatchFn }).default
      ) as PixelmatchFn
      break
    }
  }

  let PNG: PngjsModule['PNG'] | null = null
  for (const candidate of pngCandidates) {
    if (fs.existsSync(candidate)) {
      const mod = (await import(candidate)) as PngjsModule & { default?: PngjsModule }
      const resolved = mod.PNG ? mod : (mod.default as PngjsModule)
      PNG = resolved.PNG
      break
    }
  }

  if (!pixelmatch) throw new Error('pixelmatch 를 찾을 수 없습니다. pnpm install 확인')
  if (!PNG) throw new Error('pngjs 를 찾을 수 없습니다. pnpm install 확인')

  return { pixelmatch, PNG }
}

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────

interface Args {
  update: boolean
  threshold: number
  maxDiffRatio: number
  filter: RegExp | null
  onlyWeb: boolean
  onlyAdmin: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`
visual-regression.ts — 배치 시각 회귀 비교기 (DESIGN-04)

사용법:
  pnpm tsx --tsconfig tsconfig.scripts.json scripts/visual-regression.ts [options]
  bash scripts/visual-regression.sh [options]

옵션:
  --update              baseline 모드 — snapshot 갱신 (의도적 UI 변경 시)
  --threshold <n>       픽셀 색 차이 허용 비율 (0..1, 기본: 0.15)
  --max-diff-ratio <n>  diff 픽셀 / 전체 픽셀 허용 비율 (0..1, 기본: 0.05)
  --filter <regex>      특정 페이지 이름만 실행 (예: "web-login")
  --only-web            web 페이지만 실행
  --only-admin          admin 페이지만 실행
  --help, -h            이 도움말

환경변수:
  VISUAL_REGRESSION_UPDATE=1  --update 와 동일

페이지 목록 (총 ${PAGES.length}개):
${PAGES.map((p) => `  ${p.name.padEnd(36)} port=${p.port}  ${p.route}`).join('\n')}
`)
    process.exit(0)
  }

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  const update = argv.includes('--update') || process.env['VISUAL_REGRESSION_UPDATE'] === '1'

  const threshold = parseFloat(get('--threshold') ?? '0.15')
  const maxDiffRatio = parseFloat(get('--max-diff-ratio') ?? '0.05')

  const filterRaw = get('--filter')
  const filter = filterRaw ? new RegExp(filterRaw, 'i') : null

  const onlyWeb = argv.includes('--only-web')
  const onlyAdmin = argv.includes('--only-admin')

  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    console.error(
      '[visual-regression] --threshold 는 0..1 사이 숫자여야 합니다:',
      get('--threshold'),
    )
    process.exit(1)
  }
  if (isNaN(maxDiffRatio) || maxDiffRatio < 0 || maxDiffRatio > 1) {
    console.error('[visual-regression] --max-diff-ratio 는 0..1 사이 숫자여야 합니다')
    process.exit(1)
  }

  return { update, threshold, maxDiffRatio, filter, onlyWeb, onlyAdmin }
}

// ── 페이지 캡처 ───────────────────────────────────────────────────────────────

async function capturePage(
  page: PageHandle,
  def: PageDef,
  snapshotPath: string,
  isUpdate: boolean,
  pixelThreshold: number,
): Promise<{
  success: boolean
  diffRatio?: number
  diffPixels?: number
  totalPixels?: number
  error?: string
}> {
  const { width, height } = DEVICE_PRESETS[def.device]
  const url = `http://localhost:${def.port}${def.route}`

  try {
    await page.emulateMedia({ media: 'screen' })

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
    } catch {
      // SPA networkidle 타임아웃은 흔함 — domcontentloaded 폴백
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    }

    // redirect 가 발생한 경우 (예: admin / → /login) 새 URL 에서 waitForSelector
    await page.waitForTimeout(1500)

    if (def.waitForSelector) {
      try {
        await page.locator(def.waitForSelector).waitFor({ timeout: 10_000 })
      } catch {
        console.warn(`  [WARN] waitForSelector 타임아웃: ${def.waitForSelector} — 계속 진행`)
      }
    }

    // 추가 안정화 대기 (폰트 로드, hydration 완료)
    await page.waitForTimeout(1000)

    // 전체 페이지 스크린샷 (animations disabled — 결정론적)
    const screenshotBuf = await page.screenshot({
      fullPage: false, // viewport 크기만 — 일관성을 위해
      animations: 'disabled',
    })

    if (isUpdate || !fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, screenshotBuf)
      console.log(`  [SAVED] ${path.basename(snapshotPath)} (${width}x${height})`)
      return { success: true }
    }

    // compare 모드
    const { pixelmatch, PNG } = await loadPixelmatch()
    const goldenBuf = fs.readFileSync(snapshotPath)
    const actual = PNG.sync.read(screenshotBuf as Buffer)
    const golden = PNG.sync.read(goldenBuf)

    if (actual.width !== golden.width || actual.height !== golden.height) {
      return {
        success: false,
        error: `크기 불일치: actual=${actual.width}x${actual.height} vs golden=${golden.width}x${golden.height}`,
      }
    }

    const totalPixels = actual.width * actual.height
    const diffPixels = pixelmatch(
      actual.data,
      golden.data,
      null, // output diff 이미지 생략 (성능)
      actual.width,
      actual.height,
      { threshold: pixelThreshold, includeAA: true },
    )
    const diffRatio = diffPixels / totalPixels

    return { success: true, diffRatio, diffPixels, totalPixels }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs()

  // 실행할 페이지 필터링
  let pages = PAGES.filter((p) => !p.skip)
  if (args.filter) {
    const filter = args.filter
    pages = pages.filter((p) => filter.test(p.name))
  }
  if (args.onlyWeb) pages = pages.filter((p) => p.port === 3000)
  if (args.onlyAdmin) pages = pages.filter((p) => p.port === 3001)

  if (pages.length === 0) {
    console.error('[visual-regression] 실행할 페이지가 없습니다. --filter 또는 --only-* 옵션 확인')
    process.exit(1)
  }

  const mode = args.update ? 'UPDATE (baseline 갱신)' : 'COMPARE (회귀 비교)'
  console.log(`[visual-regression] 모드: ${mode}`)
  console.log(`[visual-regression] 대상: ${pages.length}개 페이지`)
  console.log(
    `[visual-regression] threshold: ${args.threshold} | maxDiffRatio: ${args.maxDiffRatio}`,
  )
  console.log(`[visual-regression] snapshot 디렉토리: ${SNAPSHOT_DIR}`)
  console.log('')

  // snapshot 디렉토리 보장
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })

  // Playwright 로드
  let pw: PlaywrightModule
  try {
    pw = await loadPlaywright()
  } catch (err) {
    console.error('[visual-regression]', String(err))
    process.exit(1)
  }

  const results: Array<{
    name: string
    status: 'saved' | 'pass' | 'fail' | 'error'
    diffRatio?: number
    diffPixels?: number
    totalPixels?: number
    error?: string
  }> = []

  // 포트별로 브라우저 재사용 (시작 오버헤드 절감)
  const ports = [...new Set(pages.map((p) => p.port))]

  for (const port of ports) {
    const portPages = pages.filter((p) => p.port === port)
    console.log(`\n[visual-regression] port=${port} — ${portPages.length}개 페이지`)

    // 각 device 별로 context 분리
    const devices = [...new Set(portPages.map((p) => p.device))]

    const browser = await pw.chromium.launch({ headless: true })

    try {
      for (const device of devices) {
        const devicePages = portPages.filter((p) => p.device === device)
        const { width, height } = DEVICE_PRESETS[device]

        const context = await browser.newContext({
          viewport: { width, height },
          locale: 'ko-KR',
        })

        try {
          for (const def of devicePages) {
            const snapshotFile = `${def.name}.png`
            const snapshotPath = path.join(SNAPSHOT_DIR, snapshotFile)

            process.stdout.write(`  ${def.name.padEnd(40)} `)

            const page = await context.newPage()
            try {
              const result = await capturePage(page, def, snapshotPath, args.update, args.threshold)

              if (args.update) {
                results.push({ name: def.name, status: 'saved' })
                process.stdout.write('SAVED\n')
              } else if (!result.success) {
                results.push({ name: def.name, status: 'error', error: result.error })
                process.stdout.write(`ERROR: ${result.error}\n`)
              } else if (result.diffRatio === undefined) {
                // 새 snapshot 생성됨 (최초 baseline)
                results.push({ name: def.name, status: 'saved' })
                process.stdout.write('SAVED (new baseline)\n')
              } else {
                // result.diffRatio !== undefined が保証されている (上のブランチで undefined チェック済み)
                const diffRatio = result.diffRatio ?? 0
                const { diffPixels, totalPixels } = result
                if (diffRatio > args.maxDiffRatio) {
                  results.push({
                    name: def.name,
                    status: 'fail',
                    diffRatio,
                    diffPixels,
                    totalPixels,
                  })
                  process.stdout.write(
                    `FAIL  diffRatio=${(diffRatio * 100).toFixed(2)}% (${diffPixels}px / ${totalPixels}px) — threshold=${(args.maxDiffRatio * 100).toFixed(0)}%\n`,
                  )
                } else {
                  results.push({
                    name: def.name,
                    status: 'pass',
                    diffRatio,
                    diffPixels,
                    totalPixels,
                  })
                  const diffLabel =
                    diffPixels === 0
                      ? 'exact match'
                      : `diffRatio=${(diffRatio * 100).toFixed(3)}% (${diffPixels}px)`
                  process.stdout.write(`PASS  ${diffLabel}\n`)
                }
              }
            } finally {
              // 페이지 닫기 전 가볍게 처리
              await (page as unknown as { close(): Promise<void> }).close().catch(() => {})
            }
          }
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }

  // ── 결과 요약 ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60))
  console.log('[visual-regression] 결과 요약')
  console.log('─'.repeat(60))

  const saved = results.filter((r) => r.status === 'saved')
  const passed = results.filter((r) => r.status === 'pass')
  const failed = results.filter((r) => r.status === 'fail')
  const errored = results.filter((r) => r.status === 'error')

  if (saved.length > 0) console.log(`  SAVED : ${saved.length}개 (baseline 갱신)`)
  if (passed.length > 0) console.log(`  PASS  : ${passed.length}개`)
  if (failed.length > 0) {
    console.log(`  FAIL  : ${failed.length}개`)
    for (const r of failed) {
      console.log(
        `    - ${r.name}: diffRatio=${((r.diffRatio ?? 0) * 100).toFixed(2)}% (${r.diffPixels}px / ${r.totalPixels}px)`,
      )
    }
  }
  if (errored.length > 0) {
    console.log(`  ERROR : ${errored.length}개`)
    for (const r of errored) {
      console.log(`    - ${r.name}: ${r.error}`)
    }
  }

  console.log('─'.repeat(60))

  if (failed.length > 0 || errored.length > 0) {
    console.log(
      '\n[visual-regression] 시각 회귀 감지됨. 의도적 변경이면 --update 로 baseline 갱신:\n' +
        '  pnpm visual-regression:update\n',
    )
    process.exit(1)
  } else {
    const total = passed.length + saved.length
    console.log(`\n[visual-regression] 완료 — ${total}개 통과\n`)
    process.exit(0)
  }
}

main()
