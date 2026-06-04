/**
 * GET  /api/admin/printers — 인쇄소 프로필 목록 조회 (모든 admin role)
 * POST /api/admin/printers — 신규 인쇄소 프로필 생성 (curator+)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError, apiOk } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { printerProfileInputSchema } from '../../../../src/lib/schemas/printer-profile'

// ─── GET /api/admin/printers ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '50')))
  const search = searchParams.get('search') ?? ''
  const isSystemParam = searchParams.get('isSystem')
  const isActiveParam = searchParams.get('isActive')

  const where = {
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(isSystemParam !== null ? { isSystem: isSystemParam === 'true' } : {}),
    ...(isActiveParam !== null ? { isActive: isActiveParam === 'true' } : {}),
  }

  const [profiles, totalCount] = await Promise.all([
    prisma.printerProfile.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.printerProfile.count({ where }),
  ])

  return apiOk({ data: profiles, totalCount })
}

// ─── POST /api/admin/printers ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '인쇄소 프로필 생성 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = printerProfileInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  const existing = await prisma.printerProfile.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) {
    return apiError('CONFLICT', `슬러그 "${parsed.data.slug}" 는 이미 사용 중입니다.`, 409)
  }

  const profile = await prisma.printerProfile.create({
    data: {
      ...parsed.data,
      isSystem: false,
      createdById: adminUser.id,
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'create',
    entityType: 'PrinterProfile',
    entityId: profile.id,
    meta: { slug: profile.slug, name: profile.name },
  })

  return NextResponse.json(profile, { status: 201 })
}
