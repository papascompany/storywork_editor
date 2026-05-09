/**
 * POST /api/resources/[id]/reject
 * draft | review → rejected (reason 필수)
 * superadmin | curator 만 가능
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../../src/lib/api-response'
import { recordAudit } from '../../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'
import { resourceRejectSchema } from '../../../../../src/lib/schemas/resource'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '거절 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  const currentStatus = String(resource.status)
  if (!['draft', 'review'].includes(currentStatus)) {
    return apiError('CONFLICT', `현재 상태(${currentStatus})에서는 거절할 수 없습니다.`, 409, {
      currentStatus,
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = resourceRejectSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      '거절 사유가 필요합니다. (5자 이상)',
      400,
      parsed.error.flatten(),
    )
  }

  const existingMeta = (resource.meta as Record<string, unknown>) ?? {}
  const updatedMeta = {
    ...existingMeta,
    rejectionReason: parsed.data.reason,
    rejectedBy: adminUser.id,
    rejectedAt: new Date().toISOString(),
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewer: adminUser.id,
      reviewNote: parsed.data.reason,
      meta: updatedMeta,
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'reject',
    entityType: 'Resource',
    entityId: id,
    diff: { status: { before: currentStatus, after: 'rejected' } },
    meta: { slug: resource.slug, reason: parsed.data.reason },
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
