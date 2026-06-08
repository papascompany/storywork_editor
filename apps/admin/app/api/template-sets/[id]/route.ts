/**
 * GET    /api/template-sets/[id] — 단건 조회 (모든 admin role)
 * PATCH  /api/template-sets/[id] — 편집 (superadmin | curator)
 * DELETE /api/template-sets/[id] — 삭제 (superadmin only)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { templateSetPatchSchema } from '../../../../src/lib/schemas/template'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/template-sets/[id] ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const templateSet = await prisma.templateSet.findUnique({
    where: { id },
    include: {
      templates: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
          slots: true,
          format: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!templateSet) return apiError('NOT_FOUND', '템플릿 세트를 찾을 수 없습니다.', 404)

  return NextResponse.json(templateSet)
}

// ─── PATCH /api/template-sets/[id] ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '템플릿 세트 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const existing = await prisma.templateSet.findUnique({
    where: { id },
    include: { templates: { select: { id: true } } },
  })
  if (!existing) return apiError('NOT_FOUND', '템플릿 세트를 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = templateSetPatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  const { templateIds, coverIdx } = parsed.data

  // templateIds 존재 확인
  if (templateIds !== undefined) {
    const existingTemplates = await prisma.template.findMany({
      where: { id: { in: templateIds } },
      select: { id: true },
    })
    if (existingTemplates.length !== templateIds.length) {
      const foundIds = existingTemplates.map((t) => t.id)
      const missingIds = templateIds.filter((tid) => !foundIds.includes(tid))
      return apiError(
        'NOT_FOUND',
        `다음 템플릿 ID를 찾을 수 없습니다: ${missingIds.join(', ')}`,
        400,
        { missingIds },
      )
    }

    // coverIdx 범위 검증
    const effectiveCoverIdx = coverIdx ?? existing.coverIdx
    if (effectiveCoverIdx >= templateIds.length) {
      return apiError(
        'VALIDATION_ERROR',
        `coverIdx(${effectiveCoverIdx})가 templateIds 길이(${templateIds.length})를 초과합니다.`,
        400,
      )
    }
  } else if (coverIdx !== undefined) {
    if (coverIdx >= existing.templates.length) {
      return apiError(
        'VALIDATION_ERROR',
        `coverIdx(${coverIdx})가 현재 templateIds 길이(${existing.templates.length})를 초과합니다.`,
        400,
      )
    }
  }

  // diff
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    diff['name'] = { before: existing.name, after: parsed.data.name }
  }
  if (templateIds !== undefined) {
    diff['templates'] = {
      before: `${existing.templates.length}개`,
      after: `${templateIds.length}개`,
    }
  }

  type UpdateData = {
    name?: string
    coverIdx?: number
    coverEnabled?: boolean | null
    coverWidthMm?: number | null
    coverHeightMm?: number | null
    isActive?: boolean
    templates?: { set: { id: string }[] }
  }

  const updateData: UpdateData = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.coverIdx !== undefined) updateData.coverIdx = parsed.data.coverIdx
  // 표지 오버라이드 — null 도 유효(상속으로 명시 리셋)이므로 undefined 만 skip
  if (parsed.data.coverEnabled !== undefined) updateData.coverEnabled = parsed.data.coverEnabled
  if (parsed.data.coverWidthMm !== undefined) updateData.coverWidthMm = parsed.data.coverWidthMm
  if (parsed.data.coverHeightMm !== undefined) updateData.coverHeightMm = parsed.data.coverHeightMm
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
  if (templateIds !== undefined) {
    updateData.templates = { set: templateIds.map((tid) => ({ id: tid })) }
  }

  const updated = await prisma.templateSet.update({
    where: { id },
    data: updateData,
    include: {
      templates: {
        select: { id: true, name: true, thumbnail: true },
      },
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'TemplateSet',
    entityId: id,
    diff,
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/template-sets/[id] ──────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '템플릿 세트 삭제 권한이 없습니다. (superadmin 전용)', 403)
  }

  const { id } = await params

  const templateSet = await prisma.templateSet.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!templateSet) return apiError('NOT_FOUND', '템플릿 세트를 찾을 수 없습니다.', 404)

  try {
    await prisma.templateSet.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'TemplateSet',
      entityId: id,
      meta: { name: templateSet.name },
    })
  } catch (err) {
    console.error('[DELETE /api/template-sets] 삭제 중 오류:', err)
    return apiError('INTERNAL_ERROR', '삭제 처리 중 오류가 발생했습니다.', 500)
  }

  return new NextResponse(null, { status: 204 })
}
