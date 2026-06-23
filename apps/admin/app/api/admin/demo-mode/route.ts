/**
 * GET   /api/admin/demo-mode — 데모 모드 현재 상태 조회
 * PATCH /api/admin/demo-mode — 데모 모드 on/off 토글 (curator+)
 *
 * 데모 모드(FeatureFlag key='demoMode')가 켜지면 web 의 /editor + 포즈검색이
 * 로그인 없이 익명 허용된다(인증 우회 시연용). web 은 service-role 로 30초 캐시 조회 —
 * 토글 반영까지 최대 ~30초.
 *
 * ⚠️ 보안: 인증을 일부 비활성화하므로 시연 후 반드시 OFF. 모든 토글은 audit 기록.
 */
import { type NextRequest } from 'next/server'

import { apiError, apiOk } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

const FLAG_KEY = 'demoMode'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)
  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const flag = await prisma.featureFlag.findUnique({ where: { key: FLAG_KEY } })
  return apiOk({ enabled: flag?.enabled ?? false, updatedAt: flag?.updatedAt ?? null })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)
  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)
  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '데모 모드 토글 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }
  const enabled = (body as { enabled?: unknown })?.enabled
  if (typeof enabled !== 'boolean') {
    return apiError('BAD_REQUEST', 'enabled(boolean) 가 필요합니다.', 400)
  }

  const before = await prisma.featureFlag.findUnique({ where: { key: FLAG_KEY } })
  const updated = await prisma.featureFlag.upsert({
    where: { key: FLAG_KEY },
    create: { key: FLAG_KEY, enabled, updatedById: adminUser.id },
    update: { enabled, updatedById: adminUser.id },
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'FeatureFlag',
    entityId: FLAG_KEY,
    diff: { enabled: { before: before?.enabled ?? false, after: enabled } },
    meta: { note: enabled ? '데모 모드 ON (인증 우회 시연)' : '데모 모드 OFF' },
  })

  return apiOk({ enabled: updated.enabled, updatedAt: updated.updatedAt })
}
