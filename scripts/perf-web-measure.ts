/**
 * perf-web-measure.ts — Web Vitals 자동 측정 (PERF-WEB-01 진단 단계)
 *
 * Playwright chromium 으로 web prod 5개 시나리오 × desktop/mobile × N회 반복 측정.
 * Navigation Timing + paint(FCP) + largest-contentful-paint + layout-shift(CLS) +
 * event Timing(INP 근사) 을 수집해 P50/P75/P95 행렬 출력 및 JSON 저장.
 *
 * 실행:
 *   pnpm perf:web                    # local (포트 3000)
 *   pnpm perf:web:prod               # prod
 *   tsx --tsconfig tsconfig.scripts.json scripts/perf-web-measure.ts [options]
 *
 * 옵션:
 *   --env <local|prod>        기본 prod (web 진단은 prod 위주)
 *   --runs <n>                반복 횟수 (기본 3 — 시간 절약. 5 가능)
 *   --output <path>           JSON 저장 경로 (기본 tmp/perf/web-<env>-<ts>.json)
 *   --scenarios <ids>         쉼표 구분 시나리오 필터 (예: s1,s3)
 *   --viewports <names>       desktop,mobile (기본 둘 다)
 *   --headed                  non-headless 모드
 *   --timeout <ms>            페이지 로드 타임아웃 (기본 30000)
 *
 * 회고 §7.2-② "실측 없이 추측 fix 금지" 룰 준수 — 본 스크립트는 진단 데이터만 산출.
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

interface Scenario {
  id: string
  label: string
  /** 측정할 URL path */
  path: string
}

type ViewportName = 'desktop' | 'mobile'

interface ViewportSpec {
  name: ViewportName
  width: number
  height: number
  /** mobile 은 deviceScaleFactor=2 + UA = iPhone-like */
  deviceScaleFactor: number
  userAgent?: string
  isMobile?: boolean
  hasTouch?: boolean
}

const VIEWPORTS: Record<ViewportName, ViewportSpec> = {
  desktop: {
    name: 'desktop',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
  },
  mobile: {
    name: 'mobile',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  },
}

interface TimingResult {
  /** TTFB (ms) */
  ttfb: number
  /** FCP (ms) */
  fcp: number
  /** LCP (ms) — Core Web Vital */
  lcp: number
  /** CLS — Core Web Vital (점수, ms 아님) */
  cls: number
  /**
   * INP 근사 (ms) — Core Web Vital.
   * 본 스크립트는 자동 interaction 을 수행하지 않으므로
   * event timing entries 중 longest input delay 또는 0 을 반환.
   * 본격 INP 는 실유저 RUM(Speed Insights) 데이터 필요.
   */
  inp: number
  /** TTI 근사 (ms) — domInteractive */
  tti: number
  /** Total (ms) — loadEventEnd 또는 domComplete */
  total: number
  /** DCL (ms) */
  dcl: number
}

interface RunRecord {
  scenario: string
  viewport: ViewportName
  env: string
  run: number
  timing: TimingResult
  url: string
  timestamp: string
  consoleErrors: number
}

interface SummaryRow {
  scenario: string
  viewport: ViewportName
  env: string
  metric: keyof TimingResult
  p50: number
  p75: number
  p95: number
  min: number
  max: number
  samples: number
}

// ── 시나리오 정의 (web prod 5개) ──────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  { id: 's1', label: '/ (마케팅 랜딩)', path: '/' },
  { id: 's2', label: '/editor (편집기 셸)', path: '/editor' },
  { id: 's3', label: '/editor/import (대본 → 페이지 Wizard)', path: '/editor/import' },
  { id: 's4', label: '/legal/terms (정적 페이지)', path: '/legal/terms' },
  { id: 's5', label: '/notices (BOARD 페이지)', path: '/notices' },
]

// ── Playwright 인터페이스 (동적 import 타입 안전 래퍼) ───────────────────────

interface ConsoleMessage {
  type(): string
  text(): string
}

interface PageHandle {
  on(event: 'console', handler: (msg: ConsoleMessage) => void): void
  goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  waitForLoadState(state: string, opts?: { timeout?: number }): Promise<void>
  evaluate<T>(fn: string | ((...args: unknown[]) => T)): Promise<T>
  close(): Promise<void>
}

interface ContextHandle {
  newPage(): Promise<PageHandle>
  addInitScript(script: { content: string } | string): Promise<void>
  close(): Promise<void>
}

interface BrowserHandle {
  newContext(opts: {
    viewport: { width: number; height: number }
    deviceScaleFactor?: number
    userAgent?: string
    isMobile?: boolean
    hasTouch?: boolean
    locale?: string
  }): Promise<ContextHandle>
  close(): Promise<void>
}

interface PlaywrightModule {
  chromium: {
    launch(opts: { headless: boolean }): Promise<BrowserHandle>
  }
}

// ── Playwright 로드 ───────────────────────────────────────────────────────────

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
  throw new Error('@playwright/test 를 찾을 수 없습니다. pnpm install 후 다시 시도하세요.')
}

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────

interface Args {
  env: 'local' | 'prod'
  runs: number
  outputPath: string
  scenarioIds: string[] | null
  viewports: ViewportName[]
  headed: boolean
  timeoutMs: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  const envRaw = get('--env') ?? 'prod'
  if (envRaw !== 'local' && envRaw !== 'prod') {
    console.error(`--env 는 "local" 또는 "prod" 만 허용: ${envRaw}`)
    process.exit(1)
  }
  const env: 'local' | 'prod' = envRaw

  const runs = parseInt(get('--runs') ?? '3', 10)
  if (isNaN(runs) || runs < 1 || runs > 50) {
    console.error('--runs 는 1~50 사이 정수')
    process.exit(1)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultOutput = path.resolve(process.cwd(), `tmp/perf/web-${env}-${ts}.json`)
  const outputPath = get('--output') ?? defaultOutput

  const scenariosRaw = get('--scenarios')
  const scenarioIds = scenariosRaw ? scenariosRaw.split(',').map((s) => s.trim()) : null

  const viewportsRaw = get('--viewports')
  const viewportNames = viewportsRaw
    ? (viewportsRaw.split(',').map((s) => s.trim()) as ViewportName[])
    : (['desktop', 'mobile'] as ViewportName[])
  const viewports = viewportNames.filter((v) => v in VIEWPORTS)
  if (viewports.length === 0) {
    console.error('--viewports 에 유효한 값이 없습니다 (desktop|mobile)')
    process.exit(1)
  }

  const headed = argv.includes('--headed')
  const timeoutMs = parseInt(get('--timeout') ?? '30000', 10)

  return { env, runs, outputPath, scenarioIds, viewports, headed, timeoutMs }
}

// ── 통계 ──────────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1)
  return Math.round(sorted[idx] ?? 0)
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
    min: Math.round(sorted[0] ?? 0),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  }
}

// ── 타이밍 수집 ───────────────────────────────────────────────────────────────

/**
 * navigation 전에 context 에 inject 할 PerformanceObserver bootstrap.
 * LCP / CLS / longest event duration 을 window.__webVitals 로 누적해
 * collectTiming() 가 안정적으로 읽도록 보장.
 */
const VITALS_INIT_SCRIPT = `
(function() {
  if (window.__webVitals) return;
  window.__webVitals = { lcp: 0, cls: 0, inp: 0 };
  try {
    new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      var last = entries[entries.length - 1];
      if (last && last.startTime > window.__webVitals.lcp) {
        window.__webVitals.lcp = last.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function(list) {
      list.getEntries().forEach(function(e) {
        if (!e.hadRecentInput) {
          window.__webVitals.cls += e.value;
        }
      });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function(list) {
      list.getEntries().forEach(function(e) {
        if (e.duration > window.__webVitals.inp) {
          window.__webVitals.inp = e.duration;
        }
      });
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) {}
})();
`

async function collectTiming(page: PageHandle): Promise<TimingResult> {
  return page.evaluate<TimingResult>(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    const navStart = nav?.startTime ?? 0

    const ttfb = nav ? Math.round(nav.responseStart - navStart) : 0
    const dcl = nav ? Math.round(nav.domContentLoadedEventEnd - navStart) : 0
    const tti = nav ? Math.round(nav.domInteractive - navStart) : 0

    const totalRaw = nav
      ? nav.loadEventEnd > 0
        ? nav.loadEventEnd - navStart
        : nav.domComplete - navStart
      : 0
    const total = Math.round(totalRaw)

    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint')
    const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0

    // window.__webVitals 는 init script (VITALS_INIT_SCRIPT) 가 buffer 한 값.
    // 자동 interaction 없으므로 INP 는 0~짧은 input 만 측정됨 — RUM 보조 필요.
    const w = window as unknown as {
      __webVitals?: { lcp: number; cls: number; inp: number }
    }
    const vitals = w.__webVitals ?? { lcp: 0, cls: 0, inp: 0 }
    const lcp = Math.round(vitals.lcp)
    const cls = Math.round(vitals.cls * 10000) / 10000
    const inp = Math.round(vitals.inp)

    return { ttfb, fcp, lcp, cls, inp, tti, total, dcl }
  })
}

// ── 시나리오 측정 ─────────────────────────────────────────────────────────────

async function measureScenario(
  page: PageHandle,
  scenario: Scenario,
  viewport: ViewportName,
  baseUrl: string,
  run: number,
  timeoutMs: number,
  env: string,
): Promise<RunRecord> {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  const url = `${baseUrl}${scenario.path}`

  // 페이지 이동 — timing 측정 대상 (networkidle 시도, 실패 시 domcontentloaded 폴백)
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })
  } catch {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    } catch (err) {
      console.warn(`    [warn] ${scenario.id}/${viewport} run=${run} goto 실패: ${String(err)}`)
    }
  }

  // LCP / CLS observer 가 추가로 수집할 시간 확보
  await page.waitForTimeout(1200)

  const timing = await collectTiming(page)

  return {
    scenario: scenario.id,
    viewport,
    env,
    run,
    timing,
    url,
    timestamp: new Date().toISOString(),
    consoleErrors: consoleErrors.length,
  }
}

// ── 표 출력 ───────────────────────────────────────────────────────────────────

function printTable(summary: SummaryRow[]): void {
  const METRICS: (keyof TimingResult)[] = ['ttfb', 'fcp', 'lcp', 'cls', 'inp', 'tti', 'total']

  const groups = [...new Set(summary.map((r) => `${r.scenario}|${r.viewport}|${r.env}`))]

  const header = ['Scenario / Viewport', 'Metric', 'P50', 'P75', 'P95', 'Min', 'Max', 'N']
  const col = [44, 8, 8, 8, 8, 8, 8, 4]

  const pad = (s: string, w: number) =>
    s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
  const padAt = (arr: string[], i: number) => pad(arr[i] ?? '', col[i] ?? 8)

  console.log('')
  console.log(header.map((_, i) => padAt(header, i)).join(' | '))
  console.log(col.map((w) => '-'.repeat(w)).join('-+-'))

  for (const g of groups) {
    const [scenId, vp] = g.split('|')
    const scen = SCENARIOS.find((s) => s.id === scenId)
    const label = `[${scenId}] ${scen?.label ?? scenId} (${vp})`

    for (const metric of METRICS) {
      const row = summary.find(
        (r) => r.scenario === scenId && r.viewport === vp && r.metric === metric,
      )
      if (!row) continue
      const unit = metric === 'cls' ? '' : 'ms'
      const cells = [
        metric === 'ttfb' ? label : '',
        metric.toUpperCase(),
        `${row.p50}${unit}`,
        `${row.p75}${unit}`,
        `${row.p95}${unit}`,
        `${row.min}${unit}`,
        `${row.max}${unit}`,
        String(row.samples),
      ]
      console.log(cells.map((_, i) => padAt(cells, i)).join(' | '))
    }
    console.log(col.map((w) => ' '.repeat(w)).join('   '))
  }
}

// ── 요약 ──────────────────────────────────────────────────────────────────────

function buildSummary(records: RunRecord[]): SummaryRow[] {
  const METRICS: (keyof TimingResult)[] = [
    'ttfb',
    'fcp',
    'lcp',
    'cls',
    'inp',
    'tti',
    'total',
    'dcl',
  ]
  const rows: SummaryRow[] = []

  const keys = [...new Set(records.map((r) => `${r.scenario}|${r.viewport}|${r.env}`))]

  for (const key of keys) {
    const [scenario, viewport, env] = key.split('|') as [string, ViewportName, string]
    const recs = records.filter(
      (r) => r.scenario === scenario && r.viewport === viewport && r.env === env,
    )
    if (recs.length === 0) continue

    for (const metric of METRICS) {
      const values = recs.map((r) => {
        const v = r.timing[metric]
        // CLS 는 소수 → P50/P75 계산 위해 *10000 로 보존, 출력 시 /10000
        return metric === 'cls' ? Math.round(v * 10000) : v
      })
      const stats = summarize(values)
      const transform = (n: number) => (metric === 'cls' ? Math.round(n) / 10000 : n)
      rows.push({
        scenario,
        viewport,
        env,
        metric,
        p50: transform(stats.p50),
        p75: transform(stats.p75),
        p95: transform(stats.p95),
        min: transform(stats.min),
        max: transform(stats.max),
        samples: values.length,
      })
    }
  }

  return rows
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs()

  const BASE_URLS: { local: string; prod: string } = {
    local: 'http://localhost:3000',
    prod: 'https://storywork-editor-web.vercel.app',
  }
  const baseUrl = BASE_URLS[args.env]

  const filterIds = args.scenarioIds
  const scenarios = filterIds ? SCENARIOS.filter((s) => filterIds.includes(s.id)) : SCENARIOS

  if (scenarios.length === 0) {
    console.error('측정할 시나리오가 없습니다.')
    process.exit(1)
  }

  console.log(`[perf-web] 환경: ${args.env} (${baseUrl})`)
  console.log(`[perf-web] 시나리오: ${scenarios.map((s) => s.id).join(', ')} × ${args.runs}회`)
  console.log(`[perf-web] 뷰포트: ${args.viewports.join(', ')}`)
  console.log('')

  const pw = await loadPlaywright().catch((err: unknown) => {
    console.error('[perf-web]', String(err))
    process.exit(1)
  })

  const browser = await pw.chromium.launch({ headless: !args.headed })

  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true })

  const allRecords: RunRecord[] = []

  try {
    for (const scenario of scenarios) {
      for (const viewport of args.viewports) {
        const vp = VIEWPORTS[viewport]
        console.log(`[perf-web] 시나리오 [${scenario.id}] ${scenario.label} (${viewport})`)

        for (let run = 1; run <= args.runs; run++) {
          process.stdout.write(`  run ${run}/${args.runs}... `)

          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: vp.deviceScaleFactor,
            userAgent: vp.userAgent,
            isMobile: vp.isMobile,
            hasTouch: vp.hasTouch,
            locale: 'ko-KR',
          })
          // PerformanceObserver bootstrap — navigation 전 inject 필요
          await context.addInitScript({ content: VITALS_INIT_SCRIPT })
          const page = await context.newPage()

          try {
            const record = await measureScenario(
              page,
              scenario,
              viewport,
              baseUrl,
              run,
              args.timeoutMs,
              args.env,
            )
            allRecords.push(record)
            const t = record.timing
            console.log(
              `TTFB=${t.ttfb}ms FCP=${t.fcp}ms LCP=${t.lcp}ms CLS=${t.cls} TTI=${t.tti}ms Total=${t.total}ms` +
                (record.consoleErrors > 0 ? ` (errs: ${record.consoleErrors})` : ''),
            )
          } catch (err) {
            console.error(`\n  [error] run=${run} 실패: ${String(err)}`)
          } finally {
            await page.close().catch(() => undefined)
            await context.close().catch(() => undefined)
          }
        }
        console.log('')
      }
    }
  } finally {
    await browser.close()
  }

  if (allRecords.length === 0) {
    console.error('[perf-web] 측정 결과 없음.')
    process.exit(1)
  }

  const summary = buildSummary(allRecords)
  printTable(summary)

  // HEAD SHA
  let headSha = 'unknown'
  try {
    const { execSync } = await import('node:child_process')
    headSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    /* noop */
  }

  const output = {
    meta: {
      headSha,
      env: args.env,
      runs: args.runs,
      viewports: args.viewports,
      measuredAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      note: '회고 §7.2-② 진단 전용 측정. INP/CLS 는 page-load only — RUM 데이터 없음.',
    },
    records: allRecords,
    summary,
  }
  fs.writeFileSync(args.outputPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n[perf-web] JSON 저장: ${args.outputPath}`)

  // CWV 임계값 요약 (P75 기준)
  const TARGETS: Partial<Record<keyof TimingResult, number>> = {
    ttfb: 800,
    fcp: 1800,
    lcp: 2500,
    cls: 0.1,
    inp: 200,
  }

  console.log('\n[perf-web] Core Web Vitals P75 (목표 대비):')
  const cwvRows = summary.filter(
    (r) => r.metric === 'lcp' || r.metric === 'cls' || r.metric === 'inp' || r.metric === 'fcp',
  )
  for (const r of cwvRows) {
    const target = TARGETS[r.metric]
    const unit = r.metric === 'cls' ? '' : 'ms'
    const flag = target !== undefined && r.p75 > target ? ' ⚠ ' : '   '
    const scen = SCENARIOS.find((s) => s.id === r.scenario)
    console.log(
      `  ${flag}[${r.scenario}/${r.viewport}] ${scen?.label}: ${r.metric.toUpperCase()} P75=${r.p75}${unit}` +
        (target !== undefined ? ` (목표 ${target}${unit})` : ''),
    )
  }
}

main().catch((err: unknown) => {
  console.error('[perf-web] 치명적 오류:', String(err))
  process.exit(1)
})
