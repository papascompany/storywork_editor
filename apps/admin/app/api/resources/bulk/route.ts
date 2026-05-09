/**
 * POST /api/resources/bulk — 일괄 액션
 *
 * publish / reject / delete / tag-add / tag-remove
 * - delete: superadmin only
 * - 나머지: curator 이상
 * - 100개까지, 부분 실패 허용
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { resourceBulkSchema } from '../../../../src/lib/schemas/resource'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '일괄 액션 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = resourceBulkSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', '요청 검증 실패', 400, parsed.error.flatten())
  }

  const { ids, action, reason, tags } = parsed.data

  // delete 는 superadmin only
  if (action === 'delete' && !hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '일괄 삭제는 superadmin 전용입니다.', 403)
  }

  // reject 에 reason 필수
  if (action === 'reject' && (!reason || reason.trim().length < 5)) {
    return apiError('BAD_REQUEST', '거절 사유는 5자 이상 필요합니다.', 400)
  }

  // tag-add / tag-remove 에 tags 필수
  if ((action === 'tag-add' || action === 'tag-remove') && (!tags || tags.length === 0)) {
    return apiError('BAD_REQUEST', '태그가 필요합니다.', 400)
  }

  const ok: string[] = []
  const failed: { id: string; reason: string }[] = []

  // 100개씩 배치 처리
  const BATCH = 100
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)

    await Promise.allSettled(
      batch.map(async (id) => {
        try {
          const resource = await prisma.resource.findUnique({ where: { id } })
          if (!resource) {
            failed.push({ id, reason: '존재하지 않는 리소스입니다.' })
            return
          }

          const currentStatus = String(resource.status)

          if (action === 'publish') {
            if (!['draft', 'review'].includes(currentStatus)) {
              failed.push({ id, reason: `상태(${currentStatus})에서 게시 불가` })
              return
            }
            await prisma.resource.update({
              where: { id },
              data: { status: 'published', reviewer: adminUser.id },
            })
            await recordAudit({
              actorId: adminUser.id,
              action: 'publish',
              entityType: 'Resource',
              entityId: id,
              diff: { status: { before: currentStatus, after: 'published' } },
            })
          } else if (action === 'reject') {
            if (!['draft', 'review'].includes(currentStatus)) {
              failed.push({ id, reason: `상태(${currentStatus})에서 거절 불가` })
              return
            }
            const existingMeta = (resource.meta as Record<string, unknown>) ?? {}
            await prisma.resource.update({
              where: { id },
              data: {
                status: 'rejected',
                reviewer: adminUser.id,
                reviewNote: reason ?? '',
                meta: {
                  ...existingMeta,
                  rejectionReason: reason,
                  rejectedBy: adminUser.id,
                  rejectedAt: new Date().toISOString(),
                },
              },
            })
            await recordAudit({
              actorId: adminUser.id,
              action: 'reject',
              entityType: 'Resource',
              entityId: id,
              diff: { status: { before: currentStatus, after: 'rejected' } },
              meta: { reason },
            })
          } else if (action === 'delete') {
            await prisma.resource.delete({ where: { id } })
            await recordAudit({
              actorId: adminUser.id,
              action: 'delete',
              entityType: 'Resource',
              entityId: id,
              meta: { slug: resource.slug },
            })
          } else if (action === 'tag-add') {
            const newTags = tags ?? []
            const currentTags = resource.tags
            const mergedTags = [...new Set([...currentTags, ...newTags])]
            await prisma.resource.update({
              where: { id },
              data: { tags: mergedTags },
            })
            await recordAudit({
              actorId: adminUser.id,
              action: 'update',
              entityType: 'Resource',
              entityId: id,
              diff: { tags: { before: currentTags, after: mergedTags } },
            })
          } else if (action === 'tag-remove') {
            const removeTags = tags ?? []
            const currentTags = resource.tags
            const filteredTags = currentTags.filter((t) => !removeTags.includes(t))
            await prisma.resource.update({
              where: { id },
              data: { tags: filteredTags },
            })
            await recordAudit({
              actorId: adminUser.id,
              action: 'update',
              entityType: 'Resource',
              entityId: id,
              diff: { tags: { before: currentTags, after: filteredTags } },
            })
          }

          ok.push(id)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
          failed.push({ id, reason: errMsg })
        }
      }),
    )
  }

  // 부분 실패 포함 항상 200 반환 — 호출자는 ok/failed 배열을 직접 검사
  return NextResponse.json({ ok, failed })
}
