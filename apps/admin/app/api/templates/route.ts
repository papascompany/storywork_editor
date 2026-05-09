/**
 * GET  /api/templates — 목록 조회 (모든 admin role)
 * POST /api/templates — 생성 (superadmin | curator)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError, apiOk } from '../../../src/lib/api-response'
import { recordAudit } from '../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'
import { templateUpsertSchema } from '../../../src/lib/schemas/template'

// ─── GET /api/templates ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
  const search = searchParams.get('search') ?? ''
  const formatId = searchParams.get('formatId') ?? ''

  type WhereClause = {
    name?: { contains: string; mode: 'insensitive' }
    formatId?: string
  }

  const where: WhereClause = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (formatId) where.formatId = formatId

  const [templates, totalCount] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: {
        format: { select: { id: true, name: true } },
        set: { select: { id: true, name: true } },
      },
    }),
    prisma.template.count({ where }),
  ])

  const data = templates.map((t) => ({
    ...t,
    slotCount: Array.isArray(t.slots) ? (t.slots as unknown[]).length : 0,
  }))

  return apiOk({ data, totalCount })
}

// ─── POST /api/templates ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '템플릿 생성 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = templateUpsertSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  // Format 존재 확인
  const format = await prisma.format.findUnique({ where: { id: parsed.data.formatId } })
  if (!format) {
    return apiError('NOT_FOUND', '지정한 판형을 찾을 수 없습니다.', 404)
  }

  const { name, formatId, slots, thumbnail, fabricJson } = parsed.data

  const template = await prisma.template.create({
    data: {
      name,
      formatId,
      slots: slots as Parameters<typeof prisma.template.create>[0]['data']['slots'],
      thumbnail: thumbnail ?? null,
      fabricJson: fabricJson as Parameters<typeof prisma.template.create>[0]['data']['fabricJson'],
    },
    include: {
      format: { select: { id: true, name: true } },
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'create',
    entityType: 'Template',
    entityId: template.id,
    meta: { name, formatId, slotCount: slots.length },
  })

  return NextResponse.json(template, { status: 201 })
}
