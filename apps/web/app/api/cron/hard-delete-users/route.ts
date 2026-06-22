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
 * 파기 순서 (⚠️ User 직속 관계 중 onDelete=RESTRICT 인 것은 명시 삭제 필요 — 미삭제 시
 * Postgres FK violation 으로 user.delete 가 실패하고 cron 이 silent 로 넘어가 영구 잔존 →
 * PIPA LEGAL-OPS-03 파기 의무 위반. 전부 단일 $transaction 으로 원자 처리):
 *   [RESTRICT → 명시 삭제]
 *     User → Subscription
 *     User → Comment (개인 댓글)
 *     User → Showcase (cascade → Reaction, Comment)
 *     User → Project (cascade → Page, SceneDoc, PublishJob, Showcase)
 *     User → Notice (관리자 자기삭제 edge — 일반 사용자는 0건)
 *   [FK 없음 → 고아/PII 정리]
 *     User → Reaction (Reaction.userId 는 plain String, FK 없음 → 명시 삭제 안 하면 고아)
 *   [SetNull → 자동, 보존]
 *     User → Resource / Character / Inquiry / Report / PrinterProfile / CompanyInfo
 *   [AuditLog: actorId plain String → cascade 없음 → 보존]
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
      // 개인 콘텐츠 파기 + User 삭제 + 감사 로그를 단일 트랜잭션으로 원자 처리.
      // RESTRICT 자식(Subscription/Comment/Showcase/Project/Notice)을 자식→부모 순으로 먼저
      // 명시 삭제해야 user.delete 가 FK violation 없이 통과한다. 하나라도 실패하면 전체 롤백되어
      // 다음 cron 실행에서 재시도(부분 삭제·허위 audit 방지).
      await prisma.$transaction([
        prisma.subscription.deleteMany({ where: { userId: user.id } }),
        // Reaction.userId 는 FK 없는 plain String → 명시 삭제 안 하면 고아 + 좋아요 PII 잔존
        prisma.reaction.deleteMany({ where: { userId: user.id } }),
        // 사용자가 남긴 댓글(타 작품 포함). Comment.userId = RESTRICT
        prisma.comment.deleteMany({ where: { userId: user.id } }),
        // 사용자의 쇼케이스 → Reaction/Comment cascade. Showcase.ownerId = RESTRICT
        prisma.showcase.deleteMany({ where: { ownerId: user.id } }),
        // 사용자의 작품 → Page/SceneDoc/PublishJob/Showcase cascade. Project.ownerId = RESTRICT
        prisma.project.deleteMany({ where: { ownerId: user.id } }),
        // 일반 사용자는 0건. 관리자 자기삭제 edge 대비. Notice.authorId = RESTRICT
        prisma.notice.deleteMany({ where: { authorId: user.id } }),
        // User 삭제 — 남은 관계(Resource/Character/Inquiry/Report/PrinterProfile/CompanyInfo)는 SetNull
        prisma.user.delete({ where: { id: user.id } }),
        // 감사 로그 (actorId 는 삭제된 사용자이므로 system 사용, email 은 감사 목적 보존)
        prisma.auditLog.create({
          data: {
            actorId: 'system:cron',
            action: 'user.hard_delete',
            target: `user:${user.id}`,
            payload: {
              email: user.email,
              deletionScheduledFor: user.deletionScheduledFor?.toISOString(),
              hardDeletedAt: now.toISOString(),
            },
          },
        }),
      ])

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
