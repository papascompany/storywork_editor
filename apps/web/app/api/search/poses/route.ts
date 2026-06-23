/**
 * POST /api/search/poses — 포즈 시맨틱 + 필터 검색 API (M2-04)
 *
 * - 인증 필수: Supabase 세션 확인 → 미인증 401.
 *   (편집기 pose 패널 전용 호출. 유료 임베딩 API + raw SQL 스캔을 익명 호출자가
 *    무제한 트리거하는 비용 남용/DoS 를 차단한다.)
 * - query 있으면 embeddingText cosine 유사도 검색
 * - filters 있으면 WHERE 절 추가 (복합 가능)
 * - 둘 다 없으면 최신순
 * - ADR-0011a: lowDpi filter 지원
 */

/* eslint-disable import/order */
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isDemoModeEnabled } from '@/lib/feature-flags'
import { createWebServerClient } from '@/lib/supabase/server'
import { embedSearchQuery } from '../../_lib/embed-server'
import { getPrismaClient } from '../../_lib/prisma'
import { buildSearchQuery } from '../../_lib/search-query'
import type { ResourceSummary, SearchPosesResponse } from '../../_lib/search-types'
/* eslint-enable import/order */

// re-export for consumer convenience
export type { ResourceSummary, SearchPosesResponse }

// ─────────────────────────────────────────────
// 요청 스키마
// ─────────────────────────────────────────────

const SearchBodySchema = z.object({
  query: z.string().max(200).optional(),
  filters: z
    .object({
      bodyType: z.array(z.string()).optional(),
      view: z.array(z.string()).optional(),
      action: z.array(z.string()).optional(),
      mood: z.array(z.string()).optional(),
      /** false → lowDpi=true 자산 제외 (ADR-0011a) */
      lowDpi: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).default(0),
})

export type SearchPosesBody = z.infer<typeof SearchBodySchema>

// ─────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now()

  // 0. 인증 확인 — 미인증 호출자의 유료 임베딩/DB 스캔 남용 차단.
  //    단, 데모 모드(admin 토글)에서는 익명 포즈 검색 허용(인증 우회 시연 — 읽기 전용).
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !authUser) {
    if (!(await isDemoModeEnabled())) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
  }

  // 1. 요청 파싱
  let body: SearchPosesBody
  try {
    const raw = (await req.json()) as unknown
    const parsed = SearchBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 형식 오류', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: '요청 본문 파싱 실패' }, { status: 400 })
  }

  const { query, filters, limit, offset } = body

  try {
    const prisma = getPrismaClient()

    // 2. 쿼리 임베딩 생성 (query 있을 때만)
    let queryVec: string | null = null
    if (query && query.trim().length > 0) {
      queryVec = await embedSearchQuery(query.trim())
    }

    // 3. 검색 실행
    const { results, total } = await buildSearchQuery(prisma, {
      queryVec,
      filters,
      limit,
      offset,
    })

    const took_ms = Date.now() - startMs

    const response: SearchPosesResponse = {
      results,
      total,
      took_ms,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[search/poses] 검색 오류:', err)
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다' }, { status: 500 })
  }
}

// GET 은 차단 (service_role 전용 — POST body 로만 쿼리)
export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST.' }, { status: 405 })
}
