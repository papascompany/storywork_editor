/**
 * GET /api/cron/hard-delete-users
 *
 * Hard delete cron placeholder — LEGAL-OPS-03.
 * deletionScheduledFor < now() 인 User 를 영구 삭제(cascade).
 *
 * 인증: Authorization: Bearer <CRON_SECRET> 헤더 필수.
 * Vercel Cron 등록됨 — apps/web/vercel.json crons (매일 18:00 UTC = 03:00 KST).
 *   Vercel Cron 이 CRON_SECRET 환경변수 설정 시 Authorization 헤더를 자동 첨부한다.
 *   ⚠️ 프로덕션에 CRON_SECRET 미설정 시 항상 401 → 파기 미실행. 등록 필수.
 * docs/runbooks/account-deletion.md 에 설정 가이드 기록.
 *
 * cascade 대상:
 *   User → Project (cascade) → Page, SceneDoc, PublishJob
 *   User → Showcase (cascade) → Reaction, Comment
 *   User → Subscription (수동 삭제 — onDelete 없음)
 *   User → Resource (SetNull)
 *   User → Character (SetNull)
 *   User → AuditLog (actorId 는 plain String → DB 레벨 cascade 없음 → 보존)
 */
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<NextResponse> {
  // ── 인증: CRON_SECRET 헤더 확인 ─────────────────────────────────────────────
  const cronSecret = process.env['CRON_SECRET']
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 영구 삭제 대상 조회 ──────────────────────────────────────────────────────
  const now = new Date()
  const targets = await prisma.user.findMany({
    where: {
      deletedAt: { not: null },
      deletionScheduledFor: { lte: now },
    },
    select: { id: true, email: true, deletionScheduledFor: true },
    take: 50, // 한 번에 최대 50명 (과부하 방지)
  })

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      message: '영구 삭제 대상이 없습니다.',
      deletedCount: 0,
      at: now.toISOString(),
    })
  }

  const results: { id: string; email: string; ok: boolean; error?: string }[] = []

  for (const user of targets) {
    try {
      // Subscription 먼저 삭제 (onDelete Cascade 없음)
      await prisma.subscription.deleteMany({ where: { userId: user.id } })

      // User 삭제 — cascade 정의된 모든 관계 자동 삭제
      await prisma.user.delete({ where: { id: user.id } })

      // Audit log (삭제 성공 기록 — actorId 는 삭제된 사용자이므로 system 사용)
      await prisma.auditLog.create({
        data: {
          actorId: 'system:cron',
          action: 'user.hard_delete',
          target: `user:${user.id}`,
          payload: {
            email: user.email, // 감사 목적 이메일 보존
            deletionScheduledFor: user.deletionScheduledFor?.toISOString(),
            hardDeletedAt: now.toISOString(),
          },
        },
      })

      results.push({ id: user.id, email: user.email, ok: true })
    } catch (err) {
      console.error(`[hard-delete-users] userId=${user.id} 삭제 실패:`, err)
      results.push({
        id: user.id,
        email: user.email,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  console.warn(`[hard-delete-users] 완료: ${succeeded}명 삭제, ${failed}명 실패`, now.toISOString())

  return NextResponse.json({
    ok: true,
    deletedCount: succeeded,
    failedCount: failed,
    results,
    at: now.toISOString(),
  })
}
