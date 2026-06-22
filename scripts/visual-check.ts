/**
 * visual-check.ts — Playwright 기반 시각 검증 래퍼 (FOLLOWUP-51, FOLLOWUP-54)
 *
 * visual-check.sh 가 위임하는 TypeScript 캡처 코어.
 * @playwright/test 의 chromium 을 headless 로 사용 (apps/web devDep 에 포함).
 *
 * 실행: pnpm tsx --tsconfig tsconfig.scripts.json scripts/visual-check.ts [options]
 *
 * 옵션:
 *   --route <path>              캡처할 라우트 (예: /editor)
 *   --port <n>                  dev 서버 포트 (기본: 3000)
 *   --viewport <WxH>            뷰포트 크기 (기본: 1280x900)
 *   --selector <css>            특정 영역만 캡처 (선택)
 *   --out <dir>                 출력 디렉토리 (기본: tmp/visual/)
 *   --wait <ms>                 페이지 로드 후 대기 시간 (기본: 2000)
 *
 * FOLLOWUP-54 신규 옵션:
 *   --url <full-url>            full URL 캡처 (예: https://storywork-editor-web.vercel.app/editor)
 *                               <route> 인자와 충돌 시 --url 우선. --port 무시.
 *   --click <selector>          캡처 전 해당 selector 클릭. semicolon(;) 구분으로 복수 지정 가능.
 *                               클릭 후 --wait ms 만큼 대기.
 *   --seed-storage <json-path>  캡처 전 localStorage 에 JSON 파일 내용 주입.
 *                               외부 URL(--url)과 함께 사용 시 에러 (cross-origin 제약).
 *   --device <desktop|tablet|mobile>
 *                               Playwright device emulation 프리셋.
 *                               desktop=1440x900, tablet=768x1024, mobile=390x844.
 *                               --viewport 보다 우선.
 *   --wait-for-selector <css>   networkidle + waitForTimeout 후 selector 출현까지 대기 (최대 10s).
 *   --emulate-media <screen|print>
 *                               CSS media type 명시 (기본: screen).
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// ── 디바이스 프리셋 ───────────────────────────────────────────────────────────
const DEVICE_PRESETS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}

// Playwright 모듈 인터페이스 (동적 import 타입 안전 래퍼)
interface PageHandle {
  on(event: string, handler: (msg: { type(): string; text(): string }) => void): void
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  waitForFunction(
    fn: string | ((...args: unknown[]) => unknown),
    opts?: { timeout?: number },
  ): Promise<void>
  emulateMedia(opts: { media: string }): Promise<void>
  addInitScript(fn: string | ((...args: unknown[]) => unknown)): Promise<void>
  evaluate<T>(fn: string | ((...args: unknown[]) => T)): Promise<T>
  screenshot(opts: { path: string; fullPage: boolean }): Promise<void>
  locator(selector: string): {
    waitFor(opts: { timeout: number }): Promise<void>
    click(): Promise<void>
    screenshot(opts: { path: string }): Promise<void>
  }
}

interface ContextHandle {
  newPage(): Promise<PageHandle>
  addInitScript(fn: string | ((...args: unknown[]) => unknown)): Promise<void>
  close(): Promise<void>
}

interface BrowserHandle {
  newContext(opts: {
    viewport: { width: number; height: number }
    locale?: string
    userAgent?: string
  }): Promise<ContextHandle>
  close(): Promise<void>
}

interface PlaywrightModule {
  chromium: {
    launch(opts: { headless: boolean }): Promise<BrowserHandle>
  }
}

// ── Playwright 동적 import (devDependency) ────────────────────────────────────
// apps/web/node_modules 또는 루트 node_modules 에서 탐색
async function loadPlaywright(): Promise<PlaywrightModule> {
  const candidates = [
    path.resolve(process.cwd(), 'node_modules/@playwright/test/index.js'),
    path.resolve(process.cwd(), 'apps/web/node_modules/@playwright/test/index.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const mod = (await import(candidate)) as PlaywrightModule & { default?: PlaywrightModule }
      // CJS interop: dynamic import 가 `{ default: <cjs exports> }` 로 래핑할 때 unwrap
      return mod.chromium ? mod : (mod.default as PlaywrightModule)
    }
  }
  throw new Error(
    '@playwright/test 를 찾을 수 없습니다.\n' +
      '  pnpm install 후 다시 시도하거나,\n' +
      '  apps/web 에 @playwright/test 가 설치되어 있는지 확인하세요.',
  )
}

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────
interface Args {
  route: string
  port: number
  viewportWidth: number
  viewportHeight: number
  selector: string | null
  outDir: string
  waitMs: number
  // FOLLOWUP-54 신규
  fullUrl: string | null
  clickSelectors: string[]
  seedStoragePath: string | null
  device: string | null
  waitForSelector: string | null
  emulateMedia: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  // --click 은 반복 허용
  const clickSelectors: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--click') {
      // semicolon 구분 지원
      const raw = argv[i + 1]
      if (raw) {
        clickSelectors.push(
          ...raw
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean),
        )
        i++
      }
    }
  }

  const route = get('--route') ?? '/'
  const port = parseInt(get('--port') ?? '3000', 10)

  // --device 가 있으면 해당 프리셋 사용, 없으면 --viewport 파싱
  const deviceKey = get('--device') ?? null
  let viewportWidth = 1280
  let viewportHeight = 900
  if (deviceKey) {
    const preset = DEVICE_PRESETS[deviceKey]
    if (!preset) {
      console.error(
        `[visual-check] --device 값 오류: "${deviceKey}". 허용: ${Object.keys(DEVICE_PRESETS).join(', ')}`,
      )
      process.exit(1)
    }
    viewportWidth = preset.width
    viewportHeight = preset.height
  } else {
    const viewportRaw = get('--viewport') ?? '1280x900'
    const [vw, vh] = viewportRaw.toLowerCase().split('x').map(Number)
    if (vw === undefined || vh === undefined || isNaN(vw) || isNaN(vh) || vw <= 0 || vh <= 0) {
      console.error('[visual-check] --viewport 형식 오류 (예: 1280x900):', viewportRaw)
      process.exit(1)
    }
    viewportWidth = vw
    viewportHeight = vh
  }

  const selector = get('--selector') ?? null
  const outDir = get('--out') ?? path.resolve(process.cwd(), 'tmp/visual')
  const waitMs = parseInt(get('--wait') ?? '2000', 10)
  const fullUrl = get('--url') ?? null
  const seedStoragePath = get('--seed-storage') ?? null
  const waitForSelector = get('--wait-for-selector') ?? null
  const emulateMedia = get('--emulate-media') ?? 'screen'

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('[visual-check] --port 가 유효하지 않습니다:', get('--port'))
    process.exit(1)
  }

  // 외부 URL + seed-storage 충돌 방지
  if (fullUrl && seedStoragePath) {
    console.error(
      '[visual-check] --url (외부 URL) 과 --seed-storage 는 함께 사용할 수 없습니다.\n' +
        '  cross-origin 제약으로 localStorage 주입이 불가능합니다.',
    )
    process.exit(1)
  }

  return {
    route,
    port,
    viewportWidth,
    viewportHeight,
    selector,
    outDir,
    waitMs,
    fullUrl,
    clickSelectors,
    seedStoragePath,
    device: deviceKey,
    waitForSelector,
    emulateMedia,
  }
}

// ── localStorage seed 로드 ────────────────────────────────────────────────────
function loadSeedStorage(jsonPath: string): Record<string, unknown> {
  const resolved = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(process.cwd(), jsonPath)
  if (!fs.existsSync(resolved)) {
    console.error(`[visual-check] --seed-storage 파일을 찾을 수 없습니다: ${resolved}`)
    process.exit(1)
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf-8')) as Record<string, unknown>
  } catch (err) {
    console.error(`[visual-check] --seed-storage JSON 파싱 실패: ${String(err)}`)
    process.exit(1)
  }
}

// ── 파일명 생성 ───────────────────────────────────────────────────────────────
function routeToSlug(route: string, fullUrl: string | null): string {
  if (fullUrl) {
    // URL 경로에서 slug 추출
    try {
      const u = new URL(fullUrl)
      let slug = u.pathname.replace(/^\//, '').replace(/\//g, '-')
      if (!slug) slug = 'root'
      return `prod-${slug}`
    } catch {
      return 'prod-unknown'
    }
  }
  let slug = route.replace(/^\//, '').replace(/\//g, '-')
  if (!slug) slug = 'root'
  return slug
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs()

  // URL 결정: --url 우선, 없으면 localhost
  const targetUrl = args.fullUrl ?? `http://localhost:${args.port}${args.route}`
  const isExternalUrl = args.fullUrl !== null

  // playwright import
  let pw: PlaywrightModule
  try {
    pw = await loadPlaywright()
  } catch (err) {
    console.error('[visual-check]', String(err))
    process.exit(1)
  }

  const { chromium } = pw

  // 출력 디렉토리 보장
  fs.mkdirSync(args.outDir, { recursive: true })

  const slug = routeToSlug(args.route, args.fullUrl)
  const outFile = path.join(args.outDir, `${slug}.png`)

  // 디바이스/뷰포트 정보 로그
  const deviceLabel = args.device
    ? `device:${args.device} (${args.viewportWidth}x${args.viewportHeight})`
    : `${args.viewportWidth}x${args.viewportHeight}`
  console.log(`[visual-check] Playwright chromium 시작 (headless)`)
  console.log(`[visual-check] 대상: ${targetUrl}`)
  console.log(`[visual-check] 뷰포트: ${deviceLabel} | 대기: ${args.waitMs}ms`)
  if (args.clickSelectors.length > 0) {
    console.log(`[visual-check] 클릭: ${args.clickSelectors.join(' → ')}`)
  }
  if (args.seedStoragePath) {
    console.log(`[visual-check] localStorage seed: ${args.seedStoragePath}`)
  }
  if (args.waitForSelector) {
    console.log(`[visual-check] waitForSelector: ${args.waitForSelector}`)
  }
  if (isExternalUrl) {
    console.log('[visual-check] 외부 URL 모드 — dev 서버 readiness 체크 없음')
  }

  const browser = await chromium.launch({ headless: true })
  let exitCode = 0

  try {
    const context = await browser.newContext({
      viewport: { width: args.viewportWidth, height: args.viewportHeight },
      locale: 'ko-KR',
    })

    // localStorage seed 주입 (initScript 방식 — 페이지 로드 전 실행)
    if (args.seedStoragePath) {
      const seedData = loadSeedStorage(args.seedStoragePath)
      const seedJson = JSON.stringify(seedData)
      await context.addInitScript(
        `(function() {
          const seed = ${seedJson};
          for (const [k, v] of Object.entries(seed)) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        })()`,
      )
    }

    const page = await context.newPage()

    // media type 명시 (CSS @media screen 보장)
    await page.emulateMedia({ media: args.emulateMedia })

    // 콘솔 에러 수집 (참고용)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    console.log(`[visual-check] 페이지 이동: ${targetUrl}`)

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30_000 })
    } catch {
      // networkidle 타임아웃은 SPA 에서 흔함 — domcontentloaded 폴백
      console.warn('[visual-check] networkidle 타임아웃, domcontentloaded 로 폴백')
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    }

    // 추가 대기 (React hydration, 애니메이션 등)
    if (args.waitMs > 0) {
      console.log(`[visual-check] ${args.waitMs}ms 대기...`)
      await page.waitForTimeout(args.waitMs)
    }

    // --wait-for-selector: 특정 엘리먼트 출현 대기
    if (args.waitForSelector) {
      console.log(`[visual-check] waitForSelector: ${args.waitForSelector}`)
      try {
        await page.locator(args.waitForSelector).waitFor({ timeout: 10_000 })
        console.log(`[visual-check] selector 확인됨: ${args.waitForSelector}`)
      } catch {
        console.warn(`[visual-check] waitForSelector 타임아웃 (10s): ${args.waitForSelector}`)
        // 타임아웃이어도 계속 진행 (진단용)
      }
    }

    // --click: 버튼/패널 토글 후 캡처
    if (args.clickSelectors.length > 0) {
      for (const sel of args.clickSelectors) {
        console.log(`[visual-check] 클릭: ${sel}`)
        try {
          const locator = page.locator(sel)
          await locator.waitFor({ timeout: 10_000 })
          await locator.click()
          console.log(`[visual-check] 클릭 완료: ${sel}`)
        } catch (err) {
          console.error(
            `[visual-check] 클릭 실패: ${sel}\n` +
              `  → ${String(err)}\n` +
              '  페이지가 완전히 로드됐는지, 또는 --wait 값을 늘려보세요.',
          )
          exitCode = 1
          break
        }
      }

      if (exitCode === 0 && args.waitMs > 0) {
        // 클릭 후 애니메이션/상태 전환 대기
        console.log(`[visual-check] 클릭 후 ${args.waitMs}ms 대기...`)
        await page.waitForTimeout(args.waitMs)
      }
    }

    // 캡처
    if (exitCode === 0) {
      if (args.selector) {
        console.log(`[visual-check] 셀렉터 캡처: ${args.selector}`)
        const element = page.locator(args.selector)

        try {
          await element.waitFor({ timeout: 10_000 })
        } catch {
          console.error(
            `[visual-check] 셀렉터를 찾을 수 없습니다: ${args.selector}\n` +
              '  페이지가 완전히 로드됐는지 확인하거나 --wait 값을 늘려보세요.',
          )
          exitCode = 1
        }

        if (exitCode === 0) {
          await element.screenshot({ path: outFile })
        }
      } else {
        console.log('[visual-check] 전체 페이지 캡처')
        await page.screenshot({ path: outFile, fullPage: false })
      }
    }

    // 콘솔 에러 요약
    if (consoleErrors.length > 0) {
      console.warn(`[visual-check] 페이지 콘솔 에러 ${consoleErrors.length}건:`)
      consoleErrors.slice(0, 5).forEach((e) => console.warn('  ', e))
      if (consoleErrors.length > 5) {
        console.warn(`  ... (${consoleErrors.length - 5}건 더)`)
      }
    }

    if (exitCode === 0) {
      console.log(`[visual-check] 저장 완료: ${outFile}`)
    }
  } catch (err) {
    console.error('[visual-check] 캡처 실패:', String(err))
    exitCode = 1
  } finally {
    await browser.close()
  }

  process.exit(exitCode)
}

main()
