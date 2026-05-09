/**
 * GET    /api/templates/[id] — 단건 조회 (모든 admin role)
 * PATCH  /api/templates/[id] — 편집 (superadmin | curator)
 * DELETE /api/templates/[id] — 삭제 (superadmin only)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { templatePatchSchema } from '../../../../src/lib/schemas/template'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/templates/[id] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      format: {
        select: {
          id: true,
          name: true,
          widthMm: true,
          heightMm: true,
          bleedMm: true,
          safeMm: true,
        },
      },
      set: { select: { id: true, name: true } },
    },
  })

  if (!template) return apiError('NOT_FOUND', '템플릿을 찾을 수 없습니다.', 404)

  return NextResponse.json(template)
}

// ─── PATCH /api/templates/[id] ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '템플릿 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const existing = await prisma.template.findUnique({ where: { id } })
  if (!existing) return apiError('NOT_FOUND', '템플릿을 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = templatePatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  // formatId 변경 시 Format 존재 확인
  if (parsed.data.formatId && parsed.data.formatId !== existing.formatId) {
    const format = await prisma.format.findUnique({ where: { id: parsed.data.formatId } })
    if (!format) {
      return apiError('NOT_FOUND', '지정한 판형을 찾을 수 없습니다.', 404)
    }
  }

  // diff 계산
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    diff['name'] = { before: existing.name, after: parsed.data.name }
  }
  if (parsed.data.slots !== undefined) {
    const prevCount = Array.isArray(existing.slots) ? (existing.slots as unknown[]).length : 0
    diff['slots'] = {
      before: `${prevCount}개`,
      after: `${parsed.data.slots.length}개`,
    }
  }

  // Prisma의 Without<> discriminated union 을 피하기 위해 unknown 으로 캐스팅 후 재캐스팅
  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData['name'] = parsed.data.name
  if (parsed.data.formatId !== undefined) updateData['formatId'] = parsed.data.formatId
  if (parsed.data.slots !== undefined) updateData['slots'] = parsed.data.slots
  if (parsed.data.thumbnail !== undefined) updateData['thumbnail'] = parsed.data.thumbnail ?? null
  if (parsed.data.fabricJson !== undefined) updateData['fabricJson'] = parsed.data.fabricJson

  const updated = await prisma.template.update({
    where: { id },
    data: updateData as Parameters<typeof prisma.template.update>[0]['data'],
    include: {
      format: { select: { id: true, name: true } },
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'Template',
    entityId: id,
    diff,
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/templates/[id] ──────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '템플릿 삭제 권한이 없습니다. (superadmin 전용)', 403)
  }

  const { id } = await params

  const template = await prisma.template.findUnique({
    where: { id },
    include: { set: { select: { id: true, name: true } } },
  })

  if (!template) return apiError('NOT_FOUND', '템플릿을 찾을 수 없습니다.', 404)

  // 사용 중인 TemplateSet 이 있으면 409
  if (template.set) {
    return apiError(
      'CONFLICT',
      `이 템플릿은 세트 "${template.set.name}"에서 사용 중입니다. 먼저 세트에서 제거하세요.`,
      409,
      { setId: template.set.id, setName: template.set.name },
    )
  }

  try {
    await prisma.template.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Template',
      entityId: id,
      meta: { name: template.name, formatId: template.formatId },
    })
  } catch (err) {
    console.error('[DELETE /api/templates] 삭제 중 오류:', err)
    return apiError('INTERNAL_ERROR', '삭제 처리 중 오류가 발생했습니다.', 500)
  }

  return new NextResponse(null, { status: 204 })
}
