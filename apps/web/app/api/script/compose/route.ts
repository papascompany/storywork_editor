/**
 * POST /api/script/compose
 *
 * ai-recommend 의 RecommendResult 와 Format(또는 formatId) 를 입력받아
 * 페이지별 fabricJson 초안을 생성한다 (ai-layout.compose()).
 *
 * 요청:
 *   {
 *     analyzed: AnalyzeResult,
 *     recommended: RecommendResult,
 *     formatId?: string,                 // DB 의 Format.id 로 자동 로드
 *     format?: LayoutFormat,             // 직접 지정 (formatId 우선)
 *     seed?: number,
 *     preferredTemplateIds?: string[],
 *     enableSplitMerge?: boolean
 *   }
 *
 * 응답:
 *   ComposeResult JSON (formatId, pages[], warnings, seed)
 *
 * 인증:
 *   - Supabase 세션 확인 → 미인증 401
 *
 * 결정론 (ADR-0007):
 *   - 같은 seed + 같은 입력 → 같은 출력 보장
 *
 * lowDpi 제약 (ADR-0011a, M2-07):
 *   - lowDpi 자산은 페이지 한 변의 1/2 이하 슬롯에만 배치
 *   - 위반 시 page.warnings 에 [lowDpi] 메시지
 */

/* eslint-disable import/order */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createWebServerClient } from '@/lib/supabase/server'
import { compose } from '@storywork/ai-layout'
import type { ComposeResult, LayoutFormat } from '@storywork/ai-layout'
import type { AnalyzeResult } from '@storywork/ai-script'
import type { RecommendResult } from '@storywork/ai-recommend'
import { prisma } from '@/lib/prisma'
/* eslint-enable import/order */

// ─── 스키마 ───────────────────────────────────────────────────────────────────

const LayoutFormatSchema = z.object({
  id: z.string(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.number().positive(),
  bleedMm: z.number().min(0).default(3),
  safeMm: z.number().min(0).default(5),
})

const ComposeRequestSchema = z
  .object({
    analyzed: z.unknown(), // 재귀 유효성 검증 비용 ↑ → recommend route 가 직전 단계에서 보장
    recommended: z.unknown(),
    formatId: z.string().cuid().optional(),
    format: LayoutFormatSchema.optional(),
    seed: z.number().int().optional(),
    preferredTemplateIds: z.array(z.string()).optional(),
    enableSplitMerge: z.boolean().optional(),
  })
  .refine((d) => d.formatId || d.format, {
    message: 'formatId 또는 format 둘 중 하나 필수',
  })

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// ─── POST /api/script/compose ────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // 1. 인증
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !authUser) return jsonError('로그인이 필요합니다.', 401)

  // 2. 요청 파싱
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('요청 본문이 유효하지 않습니다.', 400)
  }
  const parsed = ComposeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '요청 파라미터가 유효하지 않습니다.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { analyzed, recommended, formatId, format, seed, preferredTemplateIds, enableSplitMerge } =
    parsed.data

  // 3. Format 로드 (formatId 우선)
  let resolvedFormat: LayoutFormat
  if (formatId) {
    const dbFormat = await prisma.format.findUnique({
      where: { id: formatId },
      select: { id: true, widthMm: true, heightMm: true, dpi: true, bleedMm: true, safeMm: true },
    })
    if (!dbFormat) return jsonError(`Format 을 찾을 수 없습니다: ${formatId}`, 404)
    resolvedFormat = {
      id: dbFormat.id,
      widthMm: dbFormat.widthMm,
      heightMm: dbFormat.heightMm,
      dpi: dbFormat.dpi,
      bleedMm: dbFormat.bleedMm,
      safeMm: dbFormat.safeMm,
    }
  } else if (format) {
    resolvedFormat = format
  } else {
    return jsonError('formatId 또는 format 둘 중 하나 필수', 400)
  }

  // 4. compose 실행
  console.warn(
    `[ai-layout] start: userId=${authUser.id}, formatId=${resolvedFormat.id}, seed=${seed ?? 0}`,
  )

  let result: ComposeResult
  try {
    result = await compose(analyzed as AnalyzeResult, recommended as RecommendResult, {
      formatId: resolvedFormat.id,
      format: resolvedFormat,
      seed: seed ?? 0,
      preferredTemplateIds: preferredTemplateIds ?? [],
      enableSplitMerge: enableSplitMerge ?? true,
    })
  } catch (err) {
    console.error('[ai-layout] compose 실패:', err)
    return jsonError('페이지 배치 중 오류가 발생했습니다.', 500)
  }

  console.warn(`[ai-layout] done: pages=${result.pages.length}, warnings=${result.warnings.length}`)

  return NextResponse.json(result)
}

export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST.' }, { status: 405 })
}

// DB 의존 동적 라우트
export const dynamic = 'force-dynamic'
