/**
 * GET  /api/formats — 목록 조회 (모든 admin role)
 * POST /api/formats — 생성 (superadmin | curator)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError, apiOk } from '../../../src/lib/api-response'
import { recordAudit } from '../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'
import { formatInputSchema } from '../../../src/lib/schemas/format'

// ─── GET /api/formats ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
  const search = searchParams.get('search') ?? ''
  const sortParam = searchParams.get('sort') ?? 'createdAt:desc'
  const [sortField, sortDir] = sortParam.split(':')

  const validSortFields = ['name', 'widthMm', 'heightMm', 'dpi', 'createdAt']
  const orderByField = validSortFields.includes(sortField ?? '')
    ? (sortField ?? 'createdAt')
    : 'createdAt'
  const orderByDir = sortDir === 'asc' ? 'asc' : 'desc'

  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {}

  const [formats, totalCount] = await Promise.all([
    prisma.format.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: page * pageSize,
      take: pageSize,
      include: {
        _count: { select: { templates: true } },
      },
    }),
    prisma.format.count({ where }),
  ])

  const data = formats.map((f) => ({
    ...f,
    templateCount: f._count.templates,
    _count: undefined,
  }))

  return apiOk({ data, totalCount })
}

// ─── POST /api/formats ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '판형 생성 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = formatInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  const {
    name,
    widthMm,
    heightMm,
    dpi,
    bleedMm,
    safeMm,
    gridDef,
    coverEnabled,
    coverWidthMm,
    coverHeightMm,
    isActive,
  } = parsed.data

  // 중복 이름 확인
  const existing = await prisma.format.findUnique({ where: { name } })
  if (existing) {
    return apiError('CONFLICT', `이름 "${name}" 은 이미 사용 중입니다.`, 409)
  }

  const format = await prisma.format.create({
    data: {
      name,
      widthMm,
      heightMm,
      dpi,
      bleedMm,
      safeMm,
      gridDef: gridDef ?? {},
      coverEnabled,
      coverWidthMm: coverWidthMm ?? null,
      coverHeightMm: coverHeightMm ?? null,
      isActive,
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'create',
    entityType: 'Format',
    entityId: format.id,
    meta: { name, widthMm, heightMm, dpi },
  })

  return NextResponse.json(format, { status: 201 })
}
