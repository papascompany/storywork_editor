/**
 * lighthouse-gate.ts — 핵심 페이지 Lighthouse 회귀 게이트 (M9-01)
 *
 * 이미 기동된 web 서버(기본 3000)의 공개 핵심 페이지를 Lighthouse 로 감사해
 * 카테고리 점수(performance / accessibility / best-practices / seo)를 예산
 * (`tests/lighthouse/budgets.json`)과 비교한다. 하나라도 하한 미달이면 exit 1.
 *
 * Chrome 은 Playwright 가 설치한 chromium 을 chrome-launcher 로 띄운다
 * (lighthouse 의 기존 의존성 — 추가 브라우저 다운로드 없음). CI 는 시각 회귀
 * 단계에서 이미 `playwright install chromium` 과 web 서버 기동을 마친 상태다.
 *
 * 실행:
 *   pnpm lighthouse:gate                     # 예산 대비 검사 (CI 와 동일)
 *   pnpm lighthouse:baseline                 # 예산 파일 재생성
 *   tsx --tsconfig tsconfig.scripts.json scripts/lighthouse-gate.ts [options]
 *
 * 옵션:
 *   --base-url <url>      측정 대상 (기본 http://localhost:3000)
 *   --pages <ids>         쉼표 구분 페이지 필터 (예: root,login)
 *   --runs <n>            페이지당 반복 후 중간값 (기본 1, 최대 5)
 *   --update-baseline     측정값으로 예산 파일을 다시 쓴다(검사하지 않음)
 *   --target <n>          "달성한 카테고리"의 하한 (기본 90 — roadmap M9-01)
 *   --tolerance <n>       미달 카테고리의 회귀 허용 폭 (기본 5, performance 제외)
 *   --perf-tolerance <n>  performance 하한 여유 (기본 25)
 *   --output <path>       측정 원본 JSON 저장 경로
 *   --budgets <path>      예산 파일 경로 (기본 tests/lighthouse/budgets.json)
 *   --timeout <ms>        페이지당 감사 타임아웃 (기본 120000)
 *
 * 게이트 규칙(예산 생성 시 결정, 파일에 기록된 값이 정본):
 *   accessibility / best-practices / seo — 정적 감사라 실행마다 같은 점수가 나온다
 *   · 측정값 >= target(90)  → 하한 = target        — 90 밑으로 내려가면 실패
 *   · 측정값 <  target      → 하한 = 측정값 - tolerance — 지금보다 나빠지면 실패
 *   performance — 공용 CI 러너에서 코드 변경 없이 ±25 흔들린다(2026-11-28 실측:
 *   /signup 96→71, /features 94→88). 그래서 90 고정을 걸지 않고
 *   · 하한 = min(측정값, target) - perf-tolerance — 큰 폭의 퇴보만 잡는 거친 그물
 *   CI 는 --runs 3 중간값으로 이상치를 한 번 더 걸러낸다.
 * 점수를 올렸으면 `pnpm lighthouse:baseline` 으로 하한을 함께 올려 둘 것.
 */
/* eslint-disable no-console */

import fs from 'node:fs'
import path from 'node:path'

// ── 대상 페이지 ───────────────────────────────────────────────────────────────
// 로그인 없이 열리고, CI 의 더미 env(DB 연결 불가)에서도 200 으로 렌더되는 공개
// 페이지만 — 사용자 유입·전환 경로 기준.
//
// 제외한 것과 이유:
//   · /editor, /editor/import, /mypage* — 미들웨어가 Supabase 로그인을 요구해
//     Lighthouse 단독으로는 로그인 화면으로 리다이렉트된다(키보드 E2E 가 fake-supabase 로 덮는다)
//   · /showcase, /contest — DB 조회(prisma)가 필수라 더미 env 에서 500.
//     500 페이지를 감사하면 "에러 화면의 점수"를 기준선으로 굳히게 된다
//     (시각 회귀가 500 을 비교하던 2026-11-18 전례). CI 에 실 DB 가 들어오면 추가할 것
//   · /notices 는 DB 를 읽지만 조회 실패 시 빈 목록으로 렌더돼 200 — 동적 페이지 대표로 포함

interface PageDef {
  /** 예산 파일 키 + --pages 필터 값 */
  id: string
  label: string
  route: string
}

const PAGES: PageDef[] = [
  { id: 'root', label: '/ (마케팅 랜딩)', route: '/' },
  { id: 'login', label: '/login (로그인)', route: '/login' },
  { id: 'signup', label: '/signup (회원가입)', route: '/signup' },
  { id: 'features', label: '/features (기능 소개)', route: '/features' },
  { id: 'notices', label: '/notices (공지)', route: '/notices' },
  { id: 'terms', label: '/legal/terms (정적 약관)', route: '/legal/terms' },
]

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const
type CategoryId = (typeof CATEGORIES)[number]

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface Budgets {
  $schema?: string
  $comment?: string
  generatedAt: string
  /** 생성 당시의 판정 파라미터 — 재현/검토용 */
  params: { target: number; tolerance: number; perfTolerance: number; runs: number }
  pages: Record<string, Partial<Record<CategoryId, number>>>
}

interface PageScores {
  id: string
  label: string
  route: string
  scores: Record<CategoryId, number>
  /** 참고용 핵심 지표 (게이트 판정에는 쓰지 않음) */
  metrics: { fcp: number; lcp: number; tbt: number; cls: number; si: number }
}

interface Args {
  baseUrl: string
  pageIds: string[] | null
  runs: number
  updateBaseline: boolean
  target: number
  tolerance: number
  perfTolerance: number
  outputPath: string | null
  budgetsPath: string
  timeout: number
}

// ── lighthouse / chrome-launcher 최소 인터페이스 ──────────────────────────────
// 기존 스크립트(perf-web-measure.ts)와 같은 방식 — 동적 import + 좁은 래퍼로
// 타입 안전을 유지한다. lighthouse 는 ESM-only 라 require 는 쓸 수 없다.

interface LhCategory {
  score: number | null
}

interface LhAudit {
  numericValue?: number
}

interface Lhr {
  categories: Record<string, LhCategory | undefined>
  audits: Record<string, LhAudit | undefined>
  runtimeError?: { code: string; message: string }
}

interface LhRunnerResult {
  lhr: Lhr
}

type LighthouseFn = (
  url: string,
  flags: {
    port: number
    output: string
    logLevel: string
    onlyCategories: string[]
    maxWaitForLoad: number
  },
) => Promise<LhRunnerResult | undefined>

interface ChromeInstance {
  port: number
  kill(): Promise<void>
}

interface ChromeLauncherModule {
  launch(opts: { chromePath?: string; chromeFlags: string[] }): Promise<ChromeInstance>
}

async function loadLighthouse(): Promise<LighthouseFn> {
  try {
    const mod = (await import('lighthouse')) as unknown as { default: LighthouseFn }
    return mod.default
  } catch (err) {
    console.error(
      '[lighthouse-gate] lighthouse 모듈을 불러올 수 없습니다. `pnpm install` 을 먼저 실행하세요.',
    )
    console.error(String(err))
    process.exit(1)
  }
}

async function loadChromeLauncher(): Promise<ChromeLauncherModule> {
  const mod = (await import('chrome-launcher')) as unknown as ChromeLauncherModule
  return mod
}

/** Playwright 가 설치한 chromium 경로 — 없으면 chrome-launcher 기본 탐색에 맡긴다 */
async function resolveChromePath(): Promise<string | undefined> {
  try {
    const pw = (await import('playwright')) as unknown as {
      chromium: { executablePath(): string }
    }
    const p = pw.chromium.executablePath()
    return p && fs.existsSync(p) ? p : undefined
  } catch {
    return undefined
  }
}

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(import.meta.dirname ?? process.cwd(), '..')

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx !== -1 ? argv[idx + 1] : undefined
  }
  const has = (flag: string): boolean => argv.includes(flag)

  const intArg = (flag: string, def: number, min: number, max: number): number => {
    const raw = get(flag)
    if (raw === undefined) return def
    const n = Number.parseInt(raw, 10)
    if (Number.isNaN(n) || n < min || n > max) {
      console.error(`${flag} 는 ${min}~${max} 사이 정수`)
      process.exit(1)
    }
    return n
  }

  const pagesRaw = get('--pages')
  let pageIds: string[] | null = null
  if (pagesRaw !== undefined) {
    pageIds = pagesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const unknown = pageIds.filter((id) => !PAGES.some((p) => p.id === id))
    if (unknown.length > 0) {
      console.error(
        `알 수 없는 페이지 id: ${unknown.join(', ')} (사용 가능: ${PAGES.map((p) => p.id).join(', ')})`,
      )
      process.exit(1)
    }
  }

  return {
    baseUrl: (get('--base-url') ?? 'http://localhost:3000').replace(/\/$/, ''),
    pageIds,
    runs: intArg('--runs', 1, 1, 5),
    updateBaseline: has('--update-baseline'),
    target: intArg('--target', 90, 0, 100),
    tolerance: intArg('--tolerance', 5, 0, 50),
    perfTolerance: intArg('--perf-tolerance', 25, 0, 90),
    outputPath: get('--output') ?? null,
    budgetsPath: get('--budgets') ?? path.join(REPO_ROOT, 'tests/lighthouse/budgets.json'),
    timeout: intArg('--timeout', 120_000, 10_000, 600_000),
  }
}

// ── 측정 ──────────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
}

function scoreOf(lhr: Lhr, category: CategoryId): number {
  const raw = lhr.categories[category]?.score
  // score 는 0~1 (null = 측정 불가). 100점 척도 정수로 올린다 — Lighthouse UI 와 동일 반올림
  return raw === null || raw === undefined ? 0 : Math.round(raw * 100)
}

function numericAudit(lhr: Lhr, id: string): number {
  return Math.round(lhr.audits[id]?.numericValue ?? 0)
}

async function auditPage(
  lighthouse: LighthouseFn,
  port: number,
  url: string,
  args: Args,
): Promise<{ scores: Record<CategoryId, number>; metrics: PageScores['metrics'] }> {
  const runs: { scores: Record<CategoryId, number>; metrics: PageScores['metrics'] }[] = []

  for (let i = 0; i < args.runs; i++) {
    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: [...CATEGORIES],
      maxWaitForLoad: args.timeout,
    })
    if (!result) throw new Error('lighthouse 가 결과를 반환하지 않았습니다')

    const { lhr } = result
    if (lhr.runtimeError) {
      throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`)
    }

    const scores = {} as Record<CategoryId, number>
    for (const c of CATEGORIES) scores[c] = scoreOf(lhr, c)

    runs.push({
      scores,
      metrics: {
        fcp: numericAudit(lhr, 'first-contentful-paint'),
        lcp: numericAudit(lhr, 'largest-contentful-paint'),
        tbt: numericAudit(lhr, 'total-blocking-time'),
        cls: Number((lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
        si: numericAudit(lhr, 'speed-index'),
      },
    })
  }

  const scores = {} as Record<CategoryId, number>
  for (const c of CATEGORIES) scores[c] = median(runs.map((r) => r.scores[c]))
  const first = runs[0]
  if (!first) throw new Error('측정 결과가 비어 있습니다')

  const metrics: PageScores['metrics'] = {
    fcp: median(runs.map((r) => r.metrics.fcp)),
    lcp: median(runs.map((r) => r.metrics.lcp)),
    tbt: median(runs.map((r) => r.metrics.tbt)),
    cls: first.metrics.cls,
    si: median(runs.map((r) => r.metrics.si)),
  }

  return { scores, metrics }
}

// ── 예산 ──────────────────────────────────────────────────────────────────────

function minFor(category: CategoryId, score: number, args: Args): number {
  // performance 는 러너 노이즈가 커서 90 고정 대신 넉넉한 여유만 둔다(헤더 주석 참고).
  if (category === 'performance') {
    return Math.max(0, Math.min(score, args.target) - args.perfTolerance)
  }
  // 달성한 카테고리는 목표선을 하한으로 — 90 밑으로 내려가면 회귀.
  // 미달 카테고리는 현재 수준에서 tolerance 만큼만 흔들림을 허용.
  return score >= args.target ? args.target : Math.max(0, score - args.tolerance)
}

function buildBudgets(results: PageScores[], args: Args): Budgets {
  const pages: Budgets['pages'] = {}
  for (const r of results) {
    const entry: Partial<Record<CategoryId, number>> = {}
    for (const c of CATEGORIES) {
      entry[c] = minFor(c, r.scores[c], args)
    }
    pages[r.id] = entry
  }
  return {
    $comment:
      'M9-01 Lighthouse 회귀 게이트 하한. a11y/BP/SEO: 달성(>=target)은 target 고정, 미달은 측정값-tolerance. ' +
      'performance: min(측정값,target)-perfTolerance(CI 러너 노이즈 흡수). ' +
      '점수를 올렸으면 pnpm lighthouse:baseline 으로 함께 올릴 것. 수동 편집도 가능하다.',
    generatedAt: new Date().toISOString(),
    params: {
      target: args.target,
      tolerance: args.tolerance,
      perfTolerance: args.perfTolerance,
      runs: args.runs,
    },
    pages,
  }
}

function readBudgets(budgetsPath: string): Budgets {
  if (!fs.existsSync(budgetsPath)) {
    console.error(`[lighthouse-gate] 예산 파일이 없습니다: ${budgetsPath}`)
    console.error('  먼저 `pnpm lighthouse:baseline` 으로 생성하세요.')
    process.exit(1)
  }
  try {
    return JSON.parse(fs.readFileSync(budgetsPath, 'utf-8')) as Budgets
  } catch (err) {
    console.error(`[lighthouse-gate] 예산 파일을 읽을 수 없습니다: ${budgetsPath}`)
    console.error(String(err))
    process.exit(1)
  }
}

// ── 출력 ──────────────────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s
}

function printTable(results: PageScores[], budgets: Budgets | null): void {
  const cols = [34, 11, 13, 15, 7]
  const header = ['Page', 'Perf', 'A11y', 'BestPract', 'SEO']
  console.log(
    '\n' +
      header.map((h, i) => (i === 0 ? pad(h, cols[i] ?? 10) : padStart(h, cols[i] ?? 10))).join(''),
  )
  console.log('─'.repeat(cols.reduce((a, b) => a + b, 0)))

  for (const r of results) {
    const cells = [pad(r.label, cols[0] ?? 34)]
    CATEGORIES.forEach((c, i) => {
      const score = r.scores[c]
      const min = budgets?.pages[r.id]?.[c]
      const mark = min === undefined ? ' ' : score < min ? '✗' : '·'
      const text = min === undefined ? `${score}` : `${score}/${min}${mark}`
      cells.push(padStart(text, cols[i + 1] ?? 10))
    })
    console.log(cells.join(''))
  }

  console.log('\n참고 지표(중간값, 게이트 미반영):')
  for (const r of results) {
    console.log(
      `  ${pad(r.label, 34)} FCP ${r.metrics.fcp}ms · LCP ${r.metrics.lcp}ms · ` +
        `TBT ${r.metrics.tbt}ms · CLS ${r.metrics.cls} · SI ${r.metrics.si}ms`,
    )
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs()
  const targets = args.pageIds ? PAGES.filter((p) => args.pageIds?.includes(p.id)) : [...PAGES]

  console.log('[lighthouse-gate] M9-01 Lighthouse 회귀 게이트')
  console.log(`  대상: ${args.baseUrl} · 페이지 ${targets.length}개 · runs=${args.runs}`)
  console.log(
    `  모드: ${args.updateBaseline ? '예산 재생성(--update-baseline)' : '예산 대비 검사'}`,
  )

  // 대상 페이지 전부를 감사 전에 확인한다 — 하나라도 4xx/5xx·리다이렉트·연결 실패면 중단.
  // 에러 화면을 감사하면 그 점수가 기준선으로 굳는다(시각 회귀 500 전례).
  // 리다이렉트도 실패로 본다: 로그인 화면으로 튕긴 페이지는 다른 페이지를 재는 셈이다.
  const probeFailures: string[] = []
  for (const page of targets) {
    const url = `${args.baseUrl}${page.route}`
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status >= 300) probeFailures.push(`${res.status}  ${page.route}`)
    } catch (err) {
      probeFailures.push(`연결 실패  ${page.route} (${String(err)})`)
    }
  }
  if (probeFailures.length > 0) {
    console.error(
      '\n[lighthouse-gate] 감사 전 응답 확인 실패 — 정상 화면이 아닌 페이지가 있습니다:',
    )
    for (const f of probeFailures) console.error(`  · ${f}`)
    console.error(
      '  web 서버 기동·필수 env 를 확인하세요(env 누락 시 전 페이지 500). ' +
        'DB 가 필요한 페이지라면 PAGES 에서 빼야 합니다.',
    )
    process.exit(1)
  }

  const lighthouse = await loadLighthouse()
  const chromeLauncher = await loadChromeLauncher()
  const chromePath = await resolveChromePath()
  if (chromePath) console.log(`  chromium: ${chromePath}`)

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  const results: PageScores[] = []
  try {
    for (const page of targets) {
      const url = `${args.baseUrl}${page.route}`
      process.stdout.write(`  감사 중: ${page.label} ... `)
      const { scores, metrics } = await auditPage(lighthouse, chrome.port, url, args)
      console.log(CATEGORIES.map((c) => `${c.slice(0, 4)}=${scores[c]}`).join(' '))
      results.push({ id: page.id, label: page.label, route: page.route, scores, metrics })
    }
  } finally {
    await chrome.kill()
  }

  if (args.outputPath) {
    const outPath = path.resolve(process.cwd(), args.outputPath)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        { baseUrl: args.baseUrl, measuredAt: new Date().toISOString(), results },
        null,
        2,
      ),
    )
    console.log(`\n원본 저장: ${outPath}`)
  }

  if (args.updateBaseline) {
    const budgets = buildBudgets(results, args)
    fs.mkdirSync(path.dirname(args.budgetsPath), { recursive: true })
    fs.writeFileSync(args.budgetsPath, JSON.stringify(budgets, null, 2) + '\n')
    printTable(results, budgets)
    console.log(`\n예산 파일 갱신: ${args.budgetsPath}`)
    console.log('  diff 를 확인한 뒤 커밋하세요.')
    return
  }

  const budgets = readBudgets(args.budgetsPath)
  printTable(results, budgets)

  const failures: string[] = []
  const missing: string[] = []
  for (const r of results) {
    const pageBudget = budgets.pages[r.id]
    if (!pageBudget) {
      missing.push(r.id)
      continue
    }
    for (const c of CATEGORIES) {
      const min = pageBudget[c]
      if (min === undefined) {
        missing.push(`${r.id}.${c}`)
        continue
      }
      if (r.scores[c] < min) {
        failures.push(`${r.label} ${c}: ${r.scores[c]} < 하한 ${min}`)
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n[lighthouse-gate] 예산에 없는 항목: ${missing.join(', ')}` +
        ' — `pnpm lighthouse:baseline` 으로 예산을 갱신하세요.',
    )
    process.exit(1)
  }

  if (failures.length > 0) {
    console.error('\n[lighthouse-gate] ✗ 회귀 감지:')
    for (const f of failures) console.error(`  · ${f}`)
    console.error(
      '\n  점수를 되돌리거나, 의도한 변경이면 `pnpm lighthouse:baseline` 으로 예산을 갱신하세요.',
    )
    process.exit(1)
  }

  console.log('\n[lighthouse-gate] ✓ 전 페이지 하한 통과')
}

main().catch((err: unknown) => {
  console.error('[lighthouse-gate] 치명적 오류:', String(err))
  process.exit(1)
})
