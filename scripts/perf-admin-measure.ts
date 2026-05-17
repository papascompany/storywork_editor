/**
 * perf-admin-measure.ts — Admin navigation timing 자동 측정 (PERF-ADMIN-02)
 *
 * Playwright chromium 을 사용해 admin 5개 시나리오를 N회 반복 측정,
 * Navigation Timing API + PerformanceObserver (FCP/LCP) 수집 후
 * P50/P75/P95 매트릭스를 출력하고 JSON 파일로 저장한다.
 *
 * 실행:
 *   pnpm perf:admin                   # local (port 3001)
 *   pnpm perf:admin:prod              # prod
 *   tsx --tsconfig tsconfig.scripts.json scripts/perf-admin-measure.ts [options]
 *
 * 옵션:
 *   --env <local|prod>        기본 local (localhost:3001)
 *   --runs <n>                반복 횟수 (기본 5)
 *   --output <path>           JSON 저장 경로 (기본 tmp/perf/admin-<env>-<ts>.json)
 *   --scenarios <names>       쉼표 구분 시나리오 ID 필터 (예: s1,s3)
 *   --headed                  non-headless 모드 (시각 디버깅)
 *   --storage-state <path>    로그인 storage state JSON (기본 tmp/perf/admin-auth.json)
 *   --timeout <ms>            페이지 로드 타임아웃 (기본 30000)
 *
 * 인증 (storage state 방식):
 *   1. 한 번 수동으로 admin 에 로그인 후 아래 명령으로 state 저장:
 *      pnpm perf:admin:save-auth
 *      (= tsx scripts/perf-admin-save-auth.ts)
 *   2. 저장된 tmp/perf/admin-auth.json 은 .gitignore 에 의해 커밋되지 않음.
 *   3. 만료(Supabase 세션 기본 1시간, 리프레시 토큰 기준 ~1주) 시 재저장 필요.
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

interface Scenario {
  id: string
  label: string
  /** 먼저 방문할 "출발" URL (navigation 기준점 설정용) */
  from: string
  /** 실제 timing 을 측정할 "도착" URL */
  to: string
}

interface TimingResult {
  /** TTFB (ms): responseStart - navigationStart */
  ttfb: number
  /** FCP (ms): PerformanceObserver paint */
  fcp: number
  /** LCP (ms): PerformanceObserver largest-contentful-paint */
  lcp: number
  /** TTI 근사 (ms): domInteractive - navigationStart */
  tti: number
  /** Total (ms): loadEventEnd - navigationStart (또는 domComplete) */
  total: number
  /** DOMContentLoaded (ms) */
  dcl: number
}

interface RunRecord {
  scenario: string
  env: string
  run: number
  timing: TimingResult
  url: string
  timestamp: string
  /** 로딩 중 콘솔 에러 수 */
  consoleErrors: number
}

interface SummaryRow {
  scenario: string
  env: string
  metric: keyof TimingResult
  p50: number
  p75: number
  p95: number
  min: number
  max: number
  samples: number
}

// ── 시나리오 정의 ─────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 's1',
    label: '/login → /audit-logs',
    from: '/login',
    to: '/audit',
  },
  {
    id: 's2',
    label: '/audit-logs → /resources',
    from: '/audit',
    to: '/resources',
  },
  {
    id: 's3',
    label: '/resources → /templates',
    from: '/resources',
    to: '/templates',
  },
  {
    id: 's4',
    label: '/templates → /formats',
    from: '/templates',
    to: '/formats',
  },
  {
    id: 's5',
    label: '/resources/review (검수 큐)',
    from: '/resources',
    to: '/resources/review',
  },
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
  close(): Promise<void>
}

interface BrowserHandle {
  newContext(opts: {
    viewport: { width: number; height: number }
    locale?: string
    storageState?: string
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
  throw new Error(
    '@playwright/test 를 찾을 수 없습니다.\n  pnpm install 후 다시 시도하거나 apps/web 에 @playwright/test 가 설치되어 있는지 확인하세요.',
  )
}

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────

interface Args {
  env: 'local' | 'prod'
  runs: number
  outputPath: string
  scenarioIds: string[] | null
  headed: boolean
  storageStatePath: string
  timeoutMs: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }

  const envRaw = get('--env') ?? 'local'
  if (envRaw !== 'local' && envRaw !== 'prod') {
    console.error(`--env 는 "local" 또는 "prod" 만 허용: ${envRaw}`)
    process.exit(1)
  }
  const env: 'local' | 'prod' = envRaw

  const runs = parseInt(get('--runs') ?? '5', 10)
  if (isNaN(runs) || runs < 1 || runs > 50) {
    console.error('--runs 는 1~50 사이 정수: ' + get('--runs'))
    process.exit(1)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultOutput = path.resolve(process.cwd(), `tmp/perf/admin-${env}-${ts}.json`)
  const outputPath = get('--output') ?? defaultOutput

  const scenariosRaw = get('--scenarios')
  const scenarioIds = scenariosRaw ? scenariosRaw.split(',').map((s) => s.trim()) : null

  const headed = argv.includes('--headed')

  const storageStatePath =
    get('--storage-state') ?? path.resolve(process.cwd(), 'tmp/perf/admin-auth.json')

  const timeoutMs = parseInt(get('--timeout') ?? '30000', 10)

  return { env, runs, outputPath, scenarioIds, headed, storageStatePath, timeoutMs }
}

// ── 통계 계산 ─────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1)
  const val = sorted[idx]
  return Math.round(val ?? 0)
}

function summarize(values: number[]): {
  p50: number
  p75: number
  p95: number
  min: number
  max: number
} {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
    min: Math.round(sorted[0] ?? 0),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  }
}

// ── 타이밍 수집 (page.evaluate) ───────────────────────────────────────────────

/**
 * Navigation Timing Level 2 + paint entries 를 페이지에서 수집.
 * FCP/LCP 는 PerformanceObserver 대신 getEntriesByType 로 조회 (navigate 완료 후 조회 가능).
 */
async function collectTiming(page: PageHandle): Promise<TimingResult> {
  return page.evaluate<TimingResult>(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined

    const navStart = nav?.startTime ?? 0

    // TTFB
    const ttfb = nav ? Math.round(nav.responseStart - navStart) : 0

    // DCL
    const dcl = nav ? Math.round(nav.domContentLoadedEventEnd - navStart) : 0

    // TTI 근사: domInteractive
    const tti = nav ? Math.round(nav.domInteractive - navStart) : 0

    // Total: loadEventEnd (0 이면 domComplete 사용)
    const totalRaw = nav
      ? nav.loadEventEnd > 0
        ? nav.loadEventEnd - navStart
        : nav.domComplete - navStart
      : 0
    const total = Math.round(totalRaw)

    // FCP
    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint')
    const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0

    // LCP: largest-contentful-paint (비동기 observer 결과, navigate 직후 바로 있을 수도 없을 수도)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    const lastLcp = lcpEntries[lcpEntries.length - 1]
    const lcp = lastLcp ? Math.round(lastLcp.startTime) : 0

    return { ttfb, fcp, lcp, tti, total, dcl }
  })
}

// ── 단일 시나리오 측정 ────────────────────────────────────────────────────────

async function measureScenario(
  page: PageHandle,
  scenario: Scenario,
  baseUrl: string,
  run: number,
  timeoutMs: number,
  env: string,
): Promise<RunRecord> {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  const fromUrl = `${baseUrl}${scenario.from}`
  const toUrl = `${baseUrl}${scenario.to}`

  // s1 (/login → /audit) 의 경우: 로그인 state 로 /audit 에 바로 접근하므로
  // from=/login 은 스킵하고 to=/audit 만 측정 (로그인 자체 시간은 제외).
  // 나머지 시나리오: from 페이지 방문 후 to 로 이동해 timing 측정.

  if (scenario.id !== 's1') {
    // from 페이지 방문 (warm-up, timing 미수집)
    try {
      await page.goto(fromUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
      await page.waitForTimeout(500)
    } catch {
      // from 페이지 오류는 무시하고 to 측정 진행
    }
  }

  // to 페이지 이동 — timing 측정 대상
  try {
    await page.goto(toUrl, { waitUntil: 'networkidle', timeout: timeoutMs })
  } catch {
    // networkidle 타임아웃 → domcontentloaded 폴백
    try {
      await page.goto(toUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    } catch (err) {
      console.warn(`    [warn] ${scenario.id} run=${run} goto 실패: ${String(err)}`)
    }
  }

  // LCP 수집 여유 시간 (PerformanceObserver 가 비동기이므로 약간 대기)
  await page.waitForTimeout(800)

  const timing = await collectTiming(page)

  return {
    scenario: scenario.id,
    env,
    run,
    timing,
    url: toUrl,
    timestamp: new Date().toISOString(),
    consoleErrors: consoleErrors.length,
  }
}

// ── 표 출력 ───────────────────────────────────────────────────────────────────

function printTable(summary: SummaryRow[]): void {
  const METRICS: (keyof TimingResult)[] = ['ttfb', 'fcp', 'lcp', 'tti', 'dcl', 'total']

  // 시나리오 × env 그룹 추출
  const groups = [...new Set(summary.map((r) => `${r.scenario}|${r.env}`))]

  // 헤더
  const header = ['Scenario / Env', 'Metric', 'P50', 'P75', 'P95', 'Min', 'Max', 'N']
  const col = [40, 8, 7, 7, 7, 7, 7, 4]

  function pad(s: string, w: number) {
    return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
  }
  function padAt(arr: string[], i: number) {
    return pad(arr[i] ?? '', col[i] ?? 8)
  }

  console.log('')
  console.log(header.map((_, i) => padAt(header, i)).join(' | '))
  console.log(col.map((w) => '-'.repeat(w)).join('-+-'))

  for (const g of groups) {
    const parts = g.split('|')
    const scenId = parts[0] ?? ''
    const env = parts[1] ?? ''
    const scen = SCENARIOS.find((s) => s.id === scenId)
    const label = `[${scenId}] ${scen?.label ?? scenId} (${env})`

    for (const metric of METRICS) {
      const row = summary.find((r) => r.scenario === scenId && r.env === env && r.metric === metric)
      if (!row) continue
      const cells = [
        metric === 'ttfb' ? label : '',
        metric.toUpperCase(),
        `${row.p50}ms`,
        `${row.p75}ms`,
        `${row.p95}ms`,
        `${row.min}ms`,
        `${row.max}ms`,
        String(row.samples),
      ]
      console.log(cells.map((_, i) => padAt(cells, i)).join(' | '))
    }
    console.log(col.map((w) => ' '.repeat(w)).join('   '))
  }
}

// ── 요약 생성 ─────────────────────────────────────────────────────────────────

function buildSummary(records: RunRecord[], env: string): SummaryRow[] {
  const METRICS: (keyof TimingResult)[] = ['ttfb', 'fcp', 'lcp', 'tti', 'dcl', 'total']
  const rows: SummaryRow[] = []

  for (const scen of SCENARIOS) {
    const scenRecords = records.filter((r) => r.scenario === scen.id && r.env === env)
    if (scenRecords.length === 0) continue

    for (const metric of METRICS) {
      const values = scenRecords.map((r) => r.timing[metric])
      const stats = summarize(values)
      rows.push({
        scenario: scen.id,
        env,
        metric,
        ...stats,
        samples: values.length,
      })
    }
  }

  return rows
}

// ── 보고서 생성 ───────────────────────────────────────────────────────────────

function buildReportMarkdown(
  records: RunRecord[],
  summary: SummaryRow[],
  args: Args,
  headSha: string,
  measureEnv: { node: string; platform: string; chromium: string },
): string {
  const now = new Date().toISOString().slice(0, 10)
  const env = args.env

  // P75 목표 기준: TTFB≤400ms, FCP≤800ms, LCP≤2500ms, TTI≤1500ms, Total≤2500ms
  const TARGETS: Record<keyof TimingResult, number> = {
    ttfb: 400,
    fcp: 800,
    lcp: 2500,
    tti: 1500,
    total: 2500,
    dcl: 1500,
  }

  const lines: string[] = []
  lines.push(`# Admin Navigation Timing Baseline — ${now}`)
  lines.push('')
  lines.push('## 측정 환경')
  lines.push('')
  lines.push(`- HEAD: ${headSha}`)
  lines.push('- PERF-ADMIN-01 (requireRole cache + templates select payload 축소) 개선 후 측정')
  lines.push(`- 환경: ${env} / ${measureEnv.platform} / Chromium / ${measureEnv.node}`)
  lines.push(`- Chromium 버전: ${measureEnv.chromium}`)
  lines.push(`- 반복 횟수: ${args.runs}회`)
  lines.push(`- 뷰포트: 1440×900`)
  lines.push('')

  lines.push('## 시나리오별 P50/P75/P95 (ms)')
  lines.push('')
  lines.push('| Scenario | Env | TTFB P75 | FCP P75 | LCP P75 | TTI P75 | DCL P75 | Total P75 |')
  lines.push('|---|---|---|---|---|---|---|---|')

  for (const scen of SCENARIOS) {
    const scenRecords = summary.filter((r) => r.scenario === scen.id && r.env === env)
    if (scenRecords.length === 0) continue
    const get = (m: keyof TimingResult) => scenRecords.find((r) => r.metric === m)?.p75 ?? 0
    const flag = (m: keyof TimingResult, v: number) => (v > TARGETS[m] ? ` (**${v}**)` : ` ${v}`)
    lines.push(
      `| [${scen.id}] ${scen.label} | ${env}` +
        flag('ttfb', get('ttfb')) +
        ' |' +
        flag('fcp', get('fcp')) +
        ' |' +
        flag('lcp', get('lcp')) +
        ' |' +
        flag('tti', get('tti')) +
        ' |' +
        flag('dcl', get('dcl')) +
        ' |' +
        flag('total', get('total')) +
        ' |',
    )
  }

  lines.push('')
  lines.push('> 굵게 표시된 수치는 P75 목표 초과 항목.')
  lines.push('')

  lines.push('## P75 목표 수립')
  lines.push('')
  lines.push('| 지표 | 목표 | 근거 |')
  lines.push('|---|---|---|')
  lines.push('| TTFB | ≤ 400ms | Supabase Edge 왕복 + RSC 직렬화 허용치 |')
  lines.push('| FCP | ≤ 800ms | 첫 콘텐츠 인지 지점 — Core Web Vitals Good 기준 |')
  lines.push('| LCP | ≤ 2,500ms | Core Web Vitals Good 기준 |')
  lines.push('| TTI | ≤ 1,500ms | 관리자 인터랙션 가능 시점 — 즉시 체감 기준 |')
  lines.push('| DCL | ≤ 1,500ms | 서버 데이터 완전 수신 후 DOM 파싱 완료 |')
  lines.push('| Total | ≤ 2,500ms | 느려도 견딜 만한 상한 — 4s 사용자 체감 대비 목표 |')
  lines.push('')

  // 미달 항목 식별
  const METRICS: (keyof TimingResult)[] = ['ttfb', 'fcp', 'lcp', 'tti', 'dcl', 'total']
  const gaps: string[] = []
  for (const scen of SCENARIOS) {
    for (const metric of METRICS) {
      const row = summary.find(
        (r) => r.scenario === scen.id && r.env === env && r.metric === metric,
      )
      if (!row) continue
      if (row.p75 > TARGETS[metric]) {
        gaps.push(
          `- [${scen.id}] ${scen.label}: ${metric.toUpperCase()} P75=${row.p75}ms (목표 ${TARGETS[metric]}ms, 초과 +${row.p75 - TARGETS[metric]}ms)`,
        )
      }
    }
  }

  if (gaps.length > 0) {
    lines.push('## 목표 미달 항목')
    lines.push('')
    gaps.forEach((g) => lines.push(g))
    lines.push('')
  } else {
    lines.push('## 목표 달성 여부')
    lines.push('')
    lines.push('모든 시나리오가 P75 목표 이내입니다.')
    lines.push('')
  }

  lines.push('## Critical Path 분석')
  lines.push('')
  lines.push('### 병목 후보')
  lines.push('')

  // 가장 느린 시나리오 식별
  const totalRows = summary.filter((r) => r.metric === 'total' && r.env === env)
  const sortedByP75 = [...totalRows].sort((a, b) => b.p75 - a.p75)
  const slowest = sortedByP75[0]
  if (slowest) {
    const sScen = SCENARIOS.find((s) => s.id === slowest.scenario)
    lines.push(
      `가장 느린 시나리오: **[${slowest.scenario}] ${sScen?.label}** — Total P75: ${slowest.p75}ms`,
    )
    lines.push('')
  }

  lines.push('병목 원인 우선순위 (측정 기반 추정):')
  lines.push('')
  lines.push(
    '1. **middleware getUser() 왕복** — 모든 페이지 전환마다 Supabase Edge 토큰 검증 1회 수행.',
  )
  lines.push('   TTFB 가 높은 시나리오는 이 왕복이 직렬화되어 지연 유발.')
  lines.push(
    '2. **RSC payload 직렬화** — resources/page.tsx: groupBy(1쿼리)+findMany(1쿼리) 병렬 실행.',
  )
  lines.push('   LCP 가 높은 경우 RSC→클라이언트 전달 payload 크기 또는 Prisma 쿼리 지연.')
  lines.push(
    '3. **JS 번들 크기** — 첫 방문 시 Next.js chunk 직렬 로딩. prefetch 가 완전히 커버하지 못한 경우 FCP/TTI 저하.',
  )
  lines.push('')

  lines.push('## 다음 perf 작업 후보 (PERF-ADMIN-03+)')
  lines.push('')
  lines.push('목표 미달 항목과 병목 분석을 기반으로:')
  lines.push('')
  lines.push(
    '- **[PERF-ADMIN-03]** middleware getUser() 결과를 Edge Cache 또는 request-scoped memo 로 캐시 (각 요청당 1회 보장)',
  )
  lines.push(
    '- **[PERF-ADMIN-04]** resources page RSC payload 최적화 — 초기 로드 컬럼 최소화 + streaming 도입',
  )
  lines.push('- **[PERF-ADMIN-05]** Lighthouse CI 통합 — 회귀 자동 감지 (별도 PERF-CI follow-up)')
  lines.push('')

  lines.push('## 사용자 보고 "4초" 실측 비교')
  lines.push('')
  const s2TotalRow = summary.find(
    (r) => r.scenario === 's2' && r.env === env && r.metric === 'total',
  )
  const s3TotalRow = summary.find(
    (r) => r.scenario === 's3' && r.env === env && r.metric === 'total',
  )

  lines.push('사용자가 체감한 4초 지연은 PERF-ADMIN-01 이전 `/resources` 페이지 진입 시')
  lines.push('facets 4개 쿼리(직렬) + requireRole + middleware getUser 가 겹친 결과로 추정.')
  lines.push('')
  if (s2TotalRow) {
    lines.push(`- 현재 [s2] /audit → /resources Total P75: **${s2TotalRow.p75}ms**`)
  }
  if (s3TotalRow) {
    lines.push(`- 현재 [s3] /resources → /templates Total P75: **${s3TotalRow.p75}ms**`)
  }
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push(`_측정일: ${now} | 스크립트: scripts/perf-admin-measure.ts_`)

  return lines.join('\n')
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs()

  // 환경별 base URL
  const BASE_URLS: { local: string; prod: string } = {
    local: 'http://localhost:3001',
    prod: 'https://storywork-editor-admin.vercel.app',
  }
  const baseUrl: string = BASE_URLS[args.env]

  // 시나리오 필터
  const scenarioIds = args.scenarioIds
  const scenarios = scenarioIds ? SCENARIOS.filter((s) => scenarioIds.includes(s.id)) : SCENARIOS

  if (scenarios.length === 0) {
    console.error('측정할 시나리오가 없습니다. --scenarios 값을 확인하세요.')
    process.exit(1)
  }

  // storage state 확인
  const hasStorageState = fs.existsSync(args.storageStatePath)
  if (!hasStorageState) {
    console.warn(`\n[경고] storage state 파일을 찾을 수 없습니다: ${args.storageStatePath}`)
    console.warn('인증 없이 측정을 시도합니다 — 보호된 페이지는 /login 으로 리다이렉트됩니다.')
    console.warn('정확한 측정을 위해 먼저 인증 state 를 저장하세요:')
    console.warn('  pnpm perf:admin:save-auth\n')
  }

  console.log(`[perf-admin] 환경: ${args.env} (${baseUrl})`)
  console.log(`[perf-admin] 시나리오: ${scenarios.map((s) => s.id).join(', ')} (${args.runs}회)`)
  console.log(
    `[perf-admin] storage state: ${hasStorageState ? args.storageStatePath : '없음 (비인증)'}`,
  )
  console.log('')

  // Playwright 로드
  const pw: PlaywrightModule = await loadPlaywright().catch((err: unknown) => {
    console.error('[perf-admin]', String(err))
    process.exit(1)
  })

  const browser = await pw.chromium.launch({ headless: !args.headed })

  // 출력 디렉토리 보장
  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true })

  const allRecords: RunRecord[] = []

  try {
    for (const scenario of scenarios) {
      console.log(`[perf-admin] 시나리오 [${scenario.id}] ${scenario.label}`)

      for (let run = 1; run <= args.runs; run++) {
        process.stdout.write(`  run ${run}/${args.runs}... `)

        // 매 run 마다 새 context (쿠키/캐시 격리)
        const contextOpts: Parameters<BrowserHandle['newContext']>[0] = {
          viewport: { width: 1440, height: 900 },
          locale: 'ko-KR',
        }
        if (hasStorageState) {
          contextOpts.storageState = args.storageStatePath
        }

        const context = await browser.newContext(contextOpts)
        const page = await context.newPage()

        try {
          const record = await measureScenario(
            page,
            scenario,
            baseUrl,
            run,
            args.timeoutMs,
            args.env,
          )
          allRecords.push(record)
          const t = record.timing
          console.log(
            `TTFB=${t.ttfb}ms FCP=${t.fcp}ms LCP=${t.lcp}ms TTI=${t.tti}ms Total=${t.total}ms` +
              (record.consoleErrors > 0 ? ` (console errors: ${record.consoleErrors})` : ''),
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
  } finally {
    await browser.close()
  }

  if (allRecords.length === 0) {
    console.error('[perf-admin] 측정 결과가 없습니다.')
    process.exit(1)
  }

  // 요약 생성
  const summary = buildSummary(allRecords, args.env)

  // 콘솔 표 출력
  printTable(summary)

  // HEAD SHA 조회 (없으면 unknown)
  let headSha = 'unknown'
  try {
    const { execSync } = await import('node:child_process')
    headSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    // git 없으면 무시
  }

  // Chromium 버전 정보
  const measureEnv = {
    node: process.version,
    platform: process.platform,
    chromium: 'Playwright bundled Chromium',
  }

  // 마크다운 보고서
  const reportMd = buildReportMarkdown(allRecords, summary, args, headSha, measureEnv)
  const reportPath = path.resolve(
    process.cwd(),
    'docs/perf/admin-navigation-baseline-2026-05-17.md',
  )
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, reportMd, 'utf-8')
  console.log(`\n[perf-admin] 보고서 저장: ${reportPath}`)

  // JSON 결과 저장
  const output = {
    meta: {
      headSha,
      env: args.env,
      runs: args.runs,
      measuredAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
    },
    records: allRecords,
    summary,
  }
  fs.writeFileSync(args.outputPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`[perf-admin] JSON 저장: ${args.outputPath}`)

  // P75 목표 초과 항목 경고
  const TARGETS: Record<keyof TimingResult, number> = {
    ttfb: 400,
    fcp: 800,
    lcp: 2500,
    tti: 1500,
    total: 2500,
    dcl: 1500,
  }
  const exceeded = summary.filter((r) => r.p75 > TARGETS[r.metric])
  if (exceeded.length > 0) {
    console.log('')
    console.log('[perf-admin] P75 목표 초과 항목:')
    for (const r of exceeded) {
      const scen = SCENARIOS.find((s) => s.id === r.scenario)
      console.log(
        `  [${r.scenario}] ${scen?.label}: ${r.metric.toUpperCase()} P75=${r.p75}ms (목표 ${TARGETS[r.metric]}ms)`,
      )
    }
  } else {
    console.log('\n[perf-admin] 모든 시나리오 P75 목표 달성.')
  }
}

main().catch((err: unknown) => {
  console.error('[perf-admin] 치명적 오류:', String(err))
  process.exit(1)
})
