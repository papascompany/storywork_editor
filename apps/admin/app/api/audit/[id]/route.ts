/**
 * GET /api/audit/[id] — 감사 로그 단건 조회
 *
 * diff 가 큰 경우 목록은 가벼운 메타만, 단건 fetch 로 전체 payload 조회.
 * audit 는 read-only — GET 만 허용. PATCH/DELETE 핸들러 없음.
 */
import type { NextRequest } from 'next/server'

import { apiError, apiOk } from '../../../../src/lib/api-response'
import { getAdminUser, getSession } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const log = await prisma.auditLog.findUnique({ where: { id } })
  if (!log) return apiError('NOT_FOUND', `AuditLog(${id}) 를 찾을 수 없습니다.`, 404)

  // actor 이메일 조회
  const actor = await prisma.user
    .findUnique({ where: { id: log.actorId }, select: { email: true } })
    .catch(() => null)

  const colonIdx = log.target.indexOf(':')
  const entityType = colonIdx >= 0 ? log.target.slice(0, colonIdx) : log.target
  const entityId = colonIdx >= 0 ? log.target.slice(colonIdx + 1) : ''

  return apiOk({
    id: log.id,
    actorId: log.actorId,
    actorEmail: actor?.email ?? null,
    action: log.action,
    entityType,
    entityId,
    target: log.target,
    payload: log.payload as Record<string, unknown>,
    createdAt: log.at.toISOString(),
  })
}
