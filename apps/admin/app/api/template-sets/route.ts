/**
 * GET  /api/template-sets — 목록 조회 (모든 admin role)
 * POST /api/template-sets — 생성 (superadmin | curator)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError, apiOk } from '../../../src/lib/api-response'
import { recordAudit } from '../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'
import { templateSetUpsertSchema } from '../../../src/lib/schemas/template'

// ─── GET /api/template-sets ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
  const search = searchParams.get('search') ?? ''

  type WhereClause = {
    name?: { contains: string; mode: 'insensitive' }
  }

  const where: WhereClause = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const [sets, totalCount] = await Promise.all([
    prisma.templateSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: {
        templates: {
          select: { id: true, name: true, thumbnail: true, slots: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.templateSet.count({ where }),
  ])

  const data = sets.map((s) => ({
    ...s,
    templateCount: s.templates.length,
  }))

  return apiOk({ data, totalCount })
}

// ─── POST /api/template-sets ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '템플릿 세트 생성 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = templateSetUpsertSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  const { name, templateIds, coverIdx, coverEnabled, coverWidthMm, coverHeightMm, isActive } =
    parsed.data

  // coverIdx 범위 검증
  if (coverIdx >= templateIds.length) {
    return apiError(
      'VALIDATION_ERROR',
      `coverIdx(${coverIdx})가 templateIds 길이(${templateIds.length})를 초과합니다.`,
      400,
    )
  }

  // templateIds 모두 존재 확인
  const existingTemplates = await prisma.template.findMany({
    where: { id: { in: templateIds } },
    select: { id: true },
  })
  if (existingTemplates.length !== templateIds.length) {
    const foundIds = existingTemplates.map((t) => t.id)
    const missingIds = templateIds.filter((id) => !foundIds.includes(id))
    return apiError(
      'NOT_FOUND',
      `다음 템플릿 ID를 찾을 수 없습니다: ${missingIds.join(', ')}`,
      400,
      { missingIds },
    )
  }

  const templateSet = await prisma.templateSet.create({
    data: {
      name,
      coverIdx,
      coverEnabled: coverEnabled ?? null,
      coverWidthMm: coverWidthMm ?? null,
      coverHeightMm: coverHeightMm ?? null,
      isActive: isActive ?? true,
      templates: {
        connect: templateIds.map((id) => ({ id })),
      },
    },
    include: {
      templates: {
        select: { id: true, name: true, thumbnail: true },
      },
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'create',
    entityType: 'TemplateSet',
    entityId: templateSet.id,
    meta: { name, templateCount: templateIds.length },
  })

  return NextResponse.json(templateSet, { status: 201 })
}
