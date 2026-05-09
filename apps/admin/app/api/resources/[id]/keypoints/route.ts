/**
 * PATCH /api/resources/[id]/keypoints
 * 키포인트 보정 (전체 교체). inferred 플래그를 false 로 변경.
 * superadmin | curator 만 가능
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../../src/lib/api-response'
import { recordAudit } from '../../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'
import { resourceKeypointsSchema } from '../../../../../src/lib/schemas/resource'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '키포인트 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return apiError('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = resourceKeypointsSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', '키포인트 검증 실패', 400, parsed.error.flatten())
  }

  // 사람이 보정한 것은 inferred=false 로 표시
  const correctedKeypoints = parsed.data.keypoints.map((kp) => ({
    ...kp,
    inferred: false,
  }))

  const existingMeta = (resource.meta as Record<string, unknown>) ?? {}
  const prevKeypoints = existingMeta['keypoints']

  const updatedMeta = {
    ...existingMeta,
    keypoints: correctedKeypoints,
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: { meta: updatedMeta },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'Resource',
    entityId: id,
    diff: {
      'meta.keypoints': { before: prevKeypoints, after: correctedKeypoints },
    },
    meta: { slug: resource.slug, keypointCount: correctedKeypoints.length },
  })

  return NextResponse.json({
    ...updated,
    kind: String(updated.kind).replace('_', '-'),
    ownerType: String(updated.ownerType),
    format: String(updated.format),
    status: String(updated.status),
    meta: updatedMeta,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}
