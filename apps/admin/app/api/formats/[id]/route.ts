/**
 * GET    /api/formats/[id] — 단건 조회 (모든 admin role)
 * PATCH  /api/formats/[id] — 편집 (superadmin | curator)
 * DELETE /api/formats/[id] — 삭제 (superadmin only)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { formatPatchSchema } from '../../../../src/lib/schemas/format'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/formats/[id] ───────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const format = await prisma.format.findUnique({
    where: { id },
    include: { _count: { select: { templates: true } } },
  })

  if (!format) return apiError('NOT_FOUND', '판형을 찾을 수 없습니다.', 404)

  return NextResponse.json({
    ...format,
    templateCount: format._count.templates,
    _count: undefined,
  })
}

// ─── PATCH /api/formats/[id] ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '판형 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const existing = await prisma.format.findUnique({ where: { id } })
  if (!existing) return apiError('NOT_FOUND', '판형을 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = formatPatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  // 이름 중복 확인 (자신 제외)
  if (parsed.data.name && parsed.data.name !== existing.name) {
    const dup = await prisma.format.findUnique({ where: { name: parsed.data.name } })
    if (dup) {
      return apiError('CONFLICT', `이름 "${parsed.data.name}" 은 이미 사용 중입니다.`, 409)
    }
  }

  // diff 계산
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const [key, after] of Object.entries(parsed.data)) {
    const before = (existing as Record<string, unknown>)[key]
    if (before !== after) {
      diff[key] = { before, after }
    }
  }

  const updated = await prisma.format.update({
    where: { id },
    data: parsed.data,
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'Format',
    entityId: id,
    diff,
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/formats/[id] ────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '판형 삭제 권한이 없습니다. (superadmin 전용)', 403)
  }

  const { id } = await params

  const format = await prisma.format.findUnique({
    where: { id },
    include: { _count: { select: { templates: true, projects: true } } },
  })

  if (!format) return apiError('NOT_FOUND', '판형을 찾을 수 없습니다.', 404)

  const usageCount = format._count.templates + format._count.projects
  if (usageCount > 0) {
    return apiError(
      'CONFLICT',
      `이 판형은 템플릿 ${format._count.templates}개, 프로젝트 ${format._count.projects}개에서 사용 중입니다. 삭제할 수 없습니다.`,
      409,
      { templateCount: format._count.templates, projectCount: format._count.projects },
    )
  }

  // critical 액션: audit 실패 시 delete 도 롤백
  try {
    await prisma.format.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Format',
      entityId: id,
      meta: { name: format.name },
    })
  } catch (err) {
    console.error('[DELETE /api/formats] 삭제 중 오류:', err)
    return apiError('INTERNAL_ERROR', '삭제 처리 중 오류가 발생했습니다.', 500)
  }

  return new NextResponse(null, { status: 204 })
}
