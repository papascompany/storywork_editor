/**
 * GET /api/printers — 활성 인쇄소 프로필 목록 (isActive=true 만)
 *
 * 사용자 편집기의 PreflightModal 에서 인쇄소 선택 목록을 가져오는 용도.
 * 인증 필요 없음 (isActive 프로필만 노출, 민감 정보 없음).
 */
import { NextResponse } from 'next/server'

import { getPrismaClient } from '../_lib/prisma'

export async function GET(): Promise<NextResponse> {
  const prisma = getPrismaClient()

  const profiles = await prisma.printerProfile.findMany({
    where: { isActive: true },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      colorSpaces: true,
      maxPages: true,
    },
  })

  return NextResponse.json({ data: profiles })
}
