/**
 * apps/admin/src/lib/audit.ts
 *
 * 관리자 액션 감사 로그 헬퍼.
 * AuditLog 모델은 prisma/schema.prisma 에 정의됨.
 * 실패해도 메인 트랜잭션은 성공 처리 (try/catch). critical 액션 (DELETE) 은 호출자에서 트랜잭션 관리.
 *
 * 서버 전용. 클라이언트에서 import 금지.
 */
import type { Prisma } from '@prisma/client'

import { prisma } from './prisma'

export type AuditAction = 'create' | 'update' | 'delete' | 'publish' | 'reject'

export type AuditEntityType = 'Format' | 'Resource' | 'Template' | 'TemplateSet' | 'User'

export interface RecordAuditOptions {
  actorId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  diff?: Record<string, { before: unknown; after: unknown }>
  meta?: Record<string, unknown>
}

/**
 * AuditLog 레코드를 기록한다.
 * 실패 시 console.error 만 남기고 예외를 전파하지 않는다.
 * DELETE 등 critical 액션에서 rollback 이 필요하면 호출자가 try/catch 로 처리.
 */
export async function recordAudit(opts: RecordAuditOptions): Promise<void> {
  const { actorId, action, entityType, entityId, diff, meta } = opts
  const target = `${entityType.toLowerCase()}:${entityId}`

  // Prisma Json 필드 타입을 명시적으로 캐스팅
  const payload: Prisma.InputJsonValue = JSON.parse(
    JSON.stringify({
      ...(diff ? { diff } : {}),
      ...(meta ? { meta } : {}),
    }),
  ) as Prisma.InputJsonValue

  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        target,
        payload,
      },
    })
  } catch (err) {
    console.error('[audit] AuditLog 기록 실패:', { action, target, err })
  }
}
