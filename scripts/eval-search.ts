/* eslint-disable no-console */
/**
 * scripts/eval-search.ts — 포즈 검색 골든셋 평가 (M2-04)
 *
 * 실행:
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/eval-search.ts
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/eval-search.ts --url http://localhost:3001
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/eval-search.ts --top 5  # top-K 정확도
 */

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'

import { Command } from 'commander'
import pc from 'picocolors'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

interface GoldenQuery {
  id: string
  query: string
  expectedTags: string[]
  expectedAction?: string
  expectedView?: string
  expectedBodyType?: string
  filterLowDpi?: boolean
  minHits: number
  note?: string
}

interface ResourceSummary {
  id: string
  slug: string
  thumbUrl: string | null
  tags: string[]
  meta: {
    action?: string
    view?: string
    bodyType?: string
  }
  lowDpi: boolean
  score?: number
}

interface SearchResponse {
  results: ResourceSummary[]
  total: number
  took_ms: number
}

// ─────────────────────────────────────────────
// HTTP 클라이언트
// ─────────────────────────────────────────────

function postJson(url: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const bodyBuf = Buffer.from(bodyStr, 'utf8')
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyBuf.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error(`JSON 파싱 실패: ${text.slice(0, 200)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

// ─────────────────────────────────────────────
// 정확도 계산
// ─────────────────────────────────────────────

/**
 * 단일 쿼리의 top-K 정확도 (precision@K).
 * expectedTags / expectedAction / expectedView 중 하나라도 결과에 있으면 hit.
 */
function calcPrecisionAtK(gq: GoldenQuery, results: ResourceSummary[], k: number): number {
  const topK = results.slice(0, k)
  if (topK.length === 0) return 0

  let hits = 0
  for (const r of topK) {
    const allTags = [...r.tags, r.meta.action, r.meta.view, r.meta.bodyType].filter(
      (t): t is string => typeof t === 'string',
    )
    const isHit =
      gq.expectedTags.some((et) => allTags.some((t) => t.toLowerCase() === et.toLowerCase())) ||
      (gq.expectedAction !== undefined &&
        r.meta.action?.toLowerCase() === gq.expectedAction.toLowerCase()) ||
      (gq.expectedView !== undefined &&
        r.meta.view?.toLowerCase() === gq.expectedView.toLowerCase()) ||
      (gq.expectedBodyType !== undefined &&
        r.meta.bodyType?.toLowerCase() === gq.expectedBodyType.toLowerCase())

    if (isHit) hits++
  }

  return hits / topK.length
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command()
  program
    .name('eval-search')
    .description('포즈 검색 골든셋 평가')
    .option('--url <url>', 'API 베이스 URL', 'http://localhost:3000')
    .option('--top <k>', 'top-K 정확도', (v) => parseInt(v, 10), 10)
    .option('--queries <path>', '골든셋 JSON 경로', 'tests/golden/pose-search/queries.json')
    .parse(process.argv)

  const opts = program.opts() as { url: string; top: number; queries: string }
  const baseUrl = opts.url.replace(/\/$/, '')
  const topK = opts.top
  const queriesPath = path.resolve(process.cwd(), opts.queries)

  console.log(pc.bold('\n  포즈 검색 골든셋 평가'))
  console.log(`  API: ${pc.cyan(baseUrl)}`)
  console.log(`  top-K: ${topK}`)
  console.log(`  쿼리: ${queriesPath}\n`)

  const queries = JSON.parse(fs.readFileSync(queriesPath, 'utf-8')) as GoldenQuery[]

  let totalPrecision = 0
  let evaluated = 0
  const failedQueries: string[] = []

  for (const gq of queries) {
    const requestBody: Record<string, unknown> = {
      query: gq.query,
      limit: topK,
      offset: 0,
    }
    if (gq.filterLowDpi !== undefined) {
      requestBody['filters'] = { lowDpi: gq.filterLowDpi }
    }

    let resp: SearchResponse
    try {
      resp = (await postJson(`${baseUrl}/api/search/poses`, requestBody)) as SearchResponse
    } catch (err) {
      console.log(pc.red(`  [${gq.id}] FAIL (네트워크 오류): ${String(err)}`))
      failedQueries.push(gq.id)
      continue
    }

    const precision = calcPrecisionAtK(gq, resp.results, topK)

    const statusIcon =
      precision > 0 ? pc.green('PASS') : minHits(gq, resp) ? pc.yellow('PART') : pc.red('MISS')

    console.log(
      `  [${gq.id}] ${statusIcon} P@${topK}=${precision.toFixed(2)} total=${resp.total} took=${resp.took_ms}ms "${gq.query}"`,
    )

    if (gq.note) console.log(`         note: ${gq.note}`)

    totalPrecision += precision
    evaluated++
  }

  const avgPrecision = evaluated > 0 ? totalPrecision / evaluated : 0
  const target = 0.7

  console.log('\n' + '─'.repeat(60))
  console.log(pc.bold(`  평균 P@${topK}: ${avgPrecision.toFixed(3)}`))
  console.log(`  평가된 쿼리: ${evaluated}/${queries.length}`)
  if (failedQueries.length > 0) {
    console.log(pc.red(`  실패한 쿼리: ${failedQueries.join(', ')}`))
  }

  const met = avgPrecision >= target
  console.log(
    `  목표 (≥${target}): ${met ? pc.green('달성') : pc.yellow('미달 (mock 임베딩 기준 — 실제 임베딩 도입 후 재측정)')}`,
  )
  console.log('─'.repeat(60) + '\n')

  // mock 임베딩은 의미가 없으므로 목표 미달 시 process.exit(1) 하지 않음
  // 실제 임베딩 도입 후 CI에서 강제할 수 있음
}

// 총 hit 체크 (total >= minHits)
function minHits(gq: GoldenQuery, resp: SearchResponse): boolean {
  return resp.total >= gq.minHits
}

main().catch((err: unknown) => {
  console.error(pc.red('평가 중 오류:'), String(err))
  process.exit(1)
})
