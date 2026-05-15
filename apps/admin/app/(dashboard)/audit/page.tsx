/**
 * (dashboard)/audit/page.tsx — 감사 로그 목록 (Server Component)
 *
 * 초기 데이터는 서버에서 조회 후 AuditListClient 에 전달.
 * 이후 필터/페이지 전환은 클라이언트에서 /api/audit 를 직접 호출.
 * 권한: 모든 admin role 허용.
 */
import { prisma } from '../../../src/lib/prisma'
import type { AuditLogRow } from '../../api/audit/route'

import { AuditListClient } from './AuditListClient'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  // 초기 데이터: 최근 50건
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { at: 'desc' },
      take: 50,
    }),
    prisma.auditLog.count(),
  ])

  // actor 이메일 join
  const actorIds = [...new Set(logs.map((l) => l.actorId))]
  let actorEmailMap: Record<string, string> = {}
  if (actorIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, email: true },
    })
    actorEmailMap = Object.fromEntries(users.map((u) => [u.id, u.email]))
  }

  const initialData: AuditLogRow[] = logs.map((log) => {
    const colonIdx = log.target.indexOf(':')
    const entityType = colonIdx >= 0 ? log.target.slice(0, colonIdx) : log.target
    const entityId = colonIdx >= 0 ? log.target.slice(colonIdx + 1) : ''
    return {
      id: log.id,
      actorId: log.actorId,
      actorEmail: actorEmailMap[log.actorId] ?? null,
      action: log.action,
      entityType,
      entityId,
      target: log.target,
      payload: log.payload as Record<string, unknown>,
      createdAt: log.at.toISOString(),
    }
  })

  return <AuditListClient initialData={initialData} initialTotalCount={totalCount} />
}
