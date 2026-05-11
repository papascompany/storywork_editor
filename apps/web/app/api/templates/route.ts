/**
 * GET /api/templates — 퍼블리시된 템플릿 목록 (공개 읽기)
 *
 * M5-04 TemplatePanel 이 이 엔드포인트를 fetch 한다.
 * - 인증 불필요 (읽기 전용, published 데이터만)
 * - 쿼리 파라미터: status / page / pageSize / search / intent
 *
 * NOTE: Template 모델에 status 컬럼이 없다 (ADR: 마이그레이션 금지).
 *       ?status=published 는 의미상 "전체 목록" 과 동일하게 처리.
 *       다른 status 값이 오면 빈 배열 반환 (사용 측이 published 만 요청).
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getPrismaClient } from '../_lib/prisma'

// ─── 응답 타입 ─────────────────────────────────────────────────────────────────

/**
 * Format join 결과 (Format 모델에서 선택한 필드).
 */
type FormatSummary = {
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMm: number
}

/**
 * TemplatePanel 의 RawTemplate / TemplateSpec 과 호환되는 응답 형식.
 */
type TemplateRow = {
  id: string
  name: string
  formatId: string
  format: FormatSummary
  slots: unknown
  thumbnail: string | null
  intent: string | null
  createdAt: string
  updatedAt: string
}

type TemplatesResponse = {
  templates: TemplateRow[]
  totalCount: number
}

// ─── 에러 응답 헬퍼 ──────────────────────────────────────────────────────────

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── GET /api/templates ──────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)

  const statusParam = searchParams.get('status')
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
  const search = searchParams.get('search') ?? ''
  // intent 는 현재 DB 컬럼 없음 — fabricJson 메타에 있을 수 있으나 필터는 미지원 (향후)
  // 쿼리 파라미터만 수신하고, DB 필터 없이 받은 데이터에서 클라이언트 측이 처리

  // status 파라미터 검증:
  // - 없거나 'published' → 전체 목록 (DB 에 status 컬럼 없음)
  // - 다른 값 → 빈 결과 반환 (클라이언트가 published 만 요청하는 계약)
  if (statusParam !== null && statusParam !== 'published') {
    const empty: TemplatesResponse = { templates: [], totalCount: 0 }
    return NextResponse.json(empty)
  }

  const prisma = getPrismaClient()

  // 검색 조건: name 기준 부분 일치
  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {}

  try {
    const [rows, totalCount] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          formatId: true,
          format: {
            select: {
              widthMm: true,
              heightMm: true,
              bleedMm: true,
              safeMm: true,
            },
          },
          slots: true,
          thumbnail: true,
          fabricJson: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ])

    const templates: TemplateRow[] = rows.map((row) => {
      // fabricJson 에 intent 가 있을 수 있음 (admin M3-05 가 저장한 메타)
      const fabricMeta =
        row.fabricJson !== null &&
        typeof row.fabricJson === 'object' &&
        !Array.isArray(row.fabricJson)
          ? (row.fabricJson as Record<string, unknown>)
          : {}
      const intent = typeof fabricMeta['intent'] === 'string' ? fabricMeta['intent'] : null

      return {
        id: row.id,
        name: row.name,
        formatId: row.formatId,
        format: {
          widthMm: row.format.widthMm,
          heightMm: row.format.heightMm,
          bleedMm: row.format.bleedMm,
          safeMm: row.format.safeMm,
        },
        slots: row.slots,
        thumbnail: row.thumbnail ?? null,
        intent,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })

    const response: TemplatesResponse = { templates, totalCount }
    return NextResponse.json(response)
  } catch (err) {
    console.error('[api/templates] DB 조회 오류:', err)
    return jsonError('템플릿 목록 조회 중 오류가 발생했습니다.', 500)
  }
}
