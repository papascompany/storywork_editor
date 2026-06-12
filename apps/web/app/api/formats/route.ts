/**
 * GET /api/formats — 편집기 판형 카탈로그 (FOLLOWUP-COVER-02)
 *
 * FormatPickerModal 이 소비하는 읽기 전용 공개 엔드포인트.
 * - isActive=true 판형만 노출 (admin 에서 비활성화한 판형 숨김)
 * - 표지 설정 필드(coverEnabled/coverWidthMm/coverHeightMm) 포함
 * - 민감정보 없음 — 인증 불요 (편집기 자체는 미들웨어로 보호됨)
 */
import { NextResponse } from 'next/server'

import { getPrismaClient } from '../_lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const prisma = getPrismaClient()
    const formats = await prisma.format.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        widthMm: true,
        heightMm: true,
        dpi: true,
        bleedMm: true,
        safeMm: true,
        coverEnabled: true,
        coverWidthMm: true,
        coverHeightMm: true,
      },
    })
    return NextResponse.json({ formats })
  } catch (err) {
    console.error('[api/formats] 조회 실패:', err)
    // 편집기는 하드코드 프리셋으로 폴백하므로 빈 목록 + 503
    return NextResponse.json({ formats: [], error: '판형 목록 조회 실패' }, { status: 503 })
  }
}
