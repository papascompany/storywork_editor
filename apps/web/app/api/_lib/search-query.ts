/**
 * apps/web/app/api/_lib/search-query.ts
 *
 * Prisma raw SQL 기반 포즈 검색 쿼리 빌더 (M2-04).
 * - query 있으면: embeddingText cosine 유사도 (<=>)
 * - filters 만 있으면: WHERE 절 + 최신순
 * - 둘 다 없으면: 최신순
 * - ADR-0011a: lowDpi=false 필터 → lowDpi 자산 제외
 */

import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

import type { ResourceSummary } from './search-types'

// ─────────────────────────────────────────────
// 내부 타입
// ─────────────────────────────────────────────

interface SearchFilters {
  bodyType?: string[]
  view?: string[]
  action?: string[]
  mood?: string[]
  lowDpi?: boolean
}

interface BuildSearchQueryOptions {
  queryVec: string | null
  filters?: SearchFilters
  limit: number
  offset: number
}

interface SearchQueryResult {
  results: ResourceSummary[]
  total: number
}

// DB 로우 타입 (raw query 결과)
interface RawResourceRow {
  id: string
  slug: string
  thumbUrl: string | null
  width: number | null
  height: number | null
  masterDpi: number | null
  lowDpi: boolean
  meta: unknown
  tags: string[]
  score: number | null
  total_count: string // bigint → string (pg driver)
}

// ─────────────────────────────────────────────
// meta JSON에서 안전하게 필드 추출
// ─────────────────────────────────────────────

function extractMetaFields(meta: unknown): ResourceSummary['meta'] {
  if (!meta || typeof meta !== 'object') return {}
  const m = meta as Record<string, unknown>
  return {
    action: typeof m['action'] === 'string' ? m['action'] : undefined,
    view: typeof m['view'] === 'string' ? m['view'] : undefined,
    bodyType: typeof m['bodyType'] === 'string' ? m['bodyType'] : undefined,
  }
}

// ─────────────────────────────────────────────
// 검색 쿼리 빌더
// ─────────────────────────────────────────────

export async function buildSearchQuery(
  prisma: PrismaClient,
  opts: BuildSearchQueryOptions,
): Promise<SearchQueryResult> {
  const { queryVec, filters, limit, offset } = opts

  // WHERE 절 조건 수집
  const whereClauses: Prisma.Sql[] = [
    // kind=pose, status=draft|review|published (rejected 제외)
    Prisma.sql`r."kind" = 'pose'`,
    Prisma.sql`r."status" != 'rejected'`,
  ]

  // lowDpi 필터 (ADR-0011a)
  if (filters?.lowDpi === false) {
    whereClauses.push(Prisma.sql`r."lowDpi" = false`)
  }

  // bodyType 필터 (JSON 필드)
  if (filters?.bodyType && filters.bodyType.length > 0) {
    whereClauses.push(Prisma.sql`r."meta"->>'bodyType' = ANY(${filters.bodyType}::text[])`)
  }

  // view 필터 (JSON 필드)
  if (filters?.view && filters.view.length > 0) {
    whereClauses.push(Prisma.sql`r."meta"->>'view' = ANY(${filters.view}::text[])`)
  }

  // action 필터 (JSON 필드)
  if (filters?.action && filters.action.length > 0) {
    whereClauses.push(Prisma.sql`r."meta"->>'action' = ANY(${filters.action}::text[])`)
  }

  // mood 필터 (JSON 필드)
  if (filters?.mood && filters.mood.length > 0) {
    whereClauses.push(Prisma.sql`r."meta"->>'mood' = ANY(${filters.mood}::text[])`)
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`

  let rows: RawResourceRow[]

  if (queryVec) {
    // 시맨틱 검색: embeddingText cosine 유사도
    // embeddingText 가 null 인 자산은 제외 (vector 연산 불가)
    rows = await prisma.$queryRaw<RawResourceRow[]>`
      SELECT
        r."id",
        r."slug",
        r."thumbUrl",
        r."width",
        r."height",
        r."masterDpi",
        r."lowDpi",
        r."meta",
        r."tags",
        1 - (r."embeddingText" <=> ${queryVec}::vector) AS score,
        COUNT(*) OVER() AS total_count
      FROM "Resource" r
      ${whereClause}
        AND r."embeddingText" IS NOT NULL
      ORDER BY r."embeddingText" <=> ${queryVec}::vector ASC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else {
    // 필터 전용 또는 전체 목록: 최신순
    rows = await prisma.$queryRaw<RawResourceRow[]>`
      SELECT
        r."id",
        r."slug",
        r."thumbUrl",
        r."width",
        r."height",
        r."masterDpi",
        r."lowDpi",
        r."meta",
        r."tags",
        NULL::float AS score,
        COUNT(*) OVER() AS total_count
      FROM "Resource" r
      ${whereClause}
      ORDER BY r."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }

  const total = rows.length > 0 ? parseInt(rows[0]?.total_count ?? '0', 10) : 0

  const results: ResourceSummary[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    thumbUrl: row.thumbUrl,
    width: row.width,
    height: row.height,
    masterDpi: row.masterDpi,
    lowDpi: row.lowDpi,
    meta: extractMetaFields(row.meta),
    tags: Array.isArray(row.tags) ? row.tags : [],
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
  }))

  return { results, total }
}
