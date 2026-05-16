/**
 * visual-check.ts — Playwright 기반 시각 검증 래퍼 (FOLLOWUP-51)
 *
 * visual-check.sh 가 위임하는 TypeScript 캡처 코어.
 * @playwright/test 의 chromium 을 headless 로 사용 (apps/web devDep 에 포함).
 *
 * 실행: pnpm tsx --tsconfig tsconfig.scripts.json scripts/visual-check.ts [options]
 *
 * 옵션:
 *   --route <path>      캡처할 라우트 (예: /editor)
 *   --port <n>          dev 서버 포트 (기본: 3000)
 *   --viewport <WxH>    뷰포트 크기 (기본: 1280x800)
 *   --selector <css>    특정 영역만 캡처 (선택)
 *   --out <dir>         출력 디렉토리 (기본: tmp/visual/)
 *   --wait <ms>         페이지 로드 후 대기 시간 (기본: 2000)
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// Playwright 모듈 인터페이스 (동적 import 타입 안전 래퍼)
interface PlaywrightModule {
  chromium: {
    launch(opts: { headless: boolean }): Promise<{
      newContext(opts: { viewport: { width: number; height: number }; locale?: string }): Promise<{
        newPage(): Promise<{
          on(event: string, handler: (msg: { type(): string; text(): string }) => void): void
          goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>
          waitForTimeout(ms: number): Promise<void>
          screenshot(opts: { path: string; fullPage: boolean }): Promise<void>
          locator(selector: string): {
            waitFor(opts: { timeout: number }): Promise<void>
            screenshot(opts: { path: string }): Promise<void>
          }
        }>
      }>
      close(): Promise<void>
    }>
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
      return import(candidate) as Promise<PlaywrightModule>
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
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  const route = get('--route') ?? '/'
  const port = parseInt(get('--port') ?? '3000', 10)
  const viewportRaw = get('--viewport') ?? '1280x800'
  const [vw, vh] = viewportRaw.toLowerCase().split('x').map(Number)
  const selector = get('--selector') ?? null
  const outDir = get('--out') ?? path.resolve(process.cwd(), 'tmp/visual')
  const waitMs = parseInt(get('--wait') ?? '2000', 10)

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('[visual-check] --port 가 유효하지 않습니다:', get('--port'))
    process.exit(1)
  }

  if (isNaN(vw) || isNaN(vh) || vw <= 0 || vh <= 0) {
    console.error('[visual-check] --viewport 형식 오류 (예: 1280x800):', viewportRaw)
    process.exit(1)
  }

  return { route, port, viewportWidth: vw, viewportHeight: vh, selector, outDir, waitMs }
}

// ── 파일명 생성 ───────────────────────────────────────────────────────────────
function routeToSlug(route: string): string {
  let slug = route.replace(/^\//, '').replace(/\//g, '-')
  if (!slug) slug = 'root'
  // 뷰포트가 기본(1280x800)이 아닌 경우 접미사 추가 (나중에 비교 용이)
  return slug
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs()
  const url = `http://localhost:${args.port}${args.route}`

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

  const slug = routeToSlug(args.route)
  const outFile = path.join(args.outDir, `${slug}.png`)

  console.log(`[visual-check] Playwright chromium 시작 (headless)`)

  const browser = await chromium.launch({ headless: true })
  let exitCode = 0

  try {
    const context = await browser.newContext({
      viewport: { width: args.viewportWidth, height: args.viewportHeight },
      // locale 한국어
      locale: 'ko-KR',
      // 색 스키마는 시스템 기본
    })

    const page = await context.newPage()

    // 콘솔 에러 수집 (참고용)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    console.log(`[visual-check] 페이지 이동: ${url}`)

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
    } catch {
      // networkidle 타임아웃은 SPA 에서 흔함 — domcontentloaded 폴백
      console.warn('[visual-check] networkidle 타임아웃, domcontentloaded 로 폴백')
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    }

    // 추가 대기 (React hydration, 애니메이션 등)
    if (args.waitMs > 0) {
      console.log(`[visual-check] ${args.waitMs}ms 대기...`)
      await page.waitForTimeout(args.waitMs)
    }

    // 캡처
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
