/**
 * POST /api/resources/[id]/publish
 * draft | review → published
 * superadmin | curator 만 가능
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../../src/lib/api-response'
import { recordAudit } from '../../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '게시 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  const currentStatus = String(resource.status)
  if (!['draft', 'review'].includes(currentStatus)) {
    return apiError(
      'CONFLICT',
      `현재 상태(${currentStatus})에서는 게시할 수 없습니다. draft 또는 review 상태여야 합니다.`,
      409,
      { currentStatus },
    )
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: {
      status: 'published',
      reviewer: adminUser.id,
    },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'publish',
    entityType: 'Resource',
    entityId: id,
    diff: { status: { before: currentStatus, after: 'published' } },
    meta: { slug: resource.slug },
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
