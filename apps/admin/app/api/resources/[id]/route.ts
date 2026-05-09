/**
 * GET    /api/resources/[id] — 단건 조회 (모든 admin role)
 * PATCH  /api/resources/[id] — 편집 (superadmin | curator)
 * DELETE /api/resources/[id] — 삭제 (superadmin only)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { resourceUpdateSchema } from '../../../../src/lib/schemas/resource'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/resources/[id] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  return NextResponse.json({
    ...resource,
    kind: String(resource.kind).replace('_', '-'),
    ownerType: String(resource.ownerType),
    format: String(resource.format),
    status: String(resource.status),
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  })
}

// ─── PATCH /api/resources/[id] ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '리소스 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const existing = await prisma.resource.findUnique({ where: { id } })
  if (!existing) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = resourceUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  // diff 계산 (메타/태그/상태)
  const diff: Record<string, { before: unknown; after: unknown }> = {}

  if (parsed.data.tags !== undefined) {
    diff['tags'] = { before: existing.tags, after: parsed.data.tags }
  }
  if (parsed.data.status !== undefined && String(existing.status) !== parsed.data.status) {
    diff['status'] = { before: existing.status, after: parsed.data.status }
  }
  if (parsed.data.meta !== undefined) {
    diff['meta'] = { before: existing.meta, after: parsed.data.meta }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.meta !== undefined) {
    // meta 필드는 JSON merge (기존 meta 에 덮어쓰기)
    const existingMeta = (existing.meta as Record<string, unknown>) ?? {}
    updateData.meta = { ...existingMeta, ...(parsed.data.meta as Record<string, unknown>) }
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: updateData,
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'Resource',
    entityId: id,
    diff,
  })

  return NextResponse.json({
    ...updated,
    kind: String(updated.kind).replace('_', '-'),
    ownerType: String(updated.ownerType),
    format: String(updated.format),
    status: String(updated.status),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

// ─── DELETE /api/resources/[id] ──────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '리소스 삭제 권한이 없습니다. (superadmin 전용)', 403)
  }

  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  try {
    await prisma.resource.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Resource',
      entityId: id,
      meta: {
        slug: resource.slug,
        kind: resource.kind,
        fileUrl: resource.fileUrl,
      },
    })
  } catch (err) {
    console.error('[DELETE /api/resources] 삭제 중 오류:', err)
    return apiError('INTERNAL_ERROR', '삭제 처리 중 오류가 발생했습니다.', 500)
  }

  return new NextResponse(null, { status: 204 })
}
