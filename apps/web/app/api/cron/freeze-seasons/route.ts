/**
 * GET /api/cron/freeze-seasons — 공모전 시즌 자동 동결 (BOARD-05)
 *
 * closesAt 이 지난 미동결 시즌을 frozen=true 로 전환한다.
 * 출품 시간 게이트는 /api/contest/[seasonId]/submit 가 이미 권위적으로 막으므로,
 * 이 cron 은 결과 페이지 표시·admin 가시성·감사 기록을 위한 영속 스냅샷을 만든다.
 *
 * 인증: Authorization: Bearer <CRON_SECRET> 헤더 필수 (Vercel Cron 자동 첨부).
 *   ⚠️ 프로덕션에 CRON_SECRET 미설정 시 항상 401 → 동결 미실행.
 * 등록: apps/web/vercel.json crons (매일 01:00 UTC = 10:00 KST).
 * 운영 가이드: docs/runbooks/contest-season-freeze.md
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

  // ── 동결 대상 조회: 미동결 + closesAt 경과 ───────────────────────────────────
  const now = new Date()
  const targets = await prisma.contestSeason.findMany({
    where: {
      frozen: false,
      closesAt: { lte: now },
    },
    select: { id: true, name: true, closesAt: true },
    take: 100,
  })

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      message: '동결 대상 시즌이 없습니다.',
      frozenCount: 0,
      at: now.toISOString(),
    })
  }

  const results: { id: string; name: string; ok: boolean; error?: string }[] = []

  for (const season of targets) {
    try {
      // frozen 전환 + audit 를 원자적으로 — audit 실패 시 frozen 롤백되어 다음 실행에서 재시도된다.
      // (비원자 처리 시 frozen=true 커밋 후 audit 누락 → 다음 cron 의 frozen=false 조건에서 빠져 영구 누락)
      await prisma.$transaction([
        prisma.contestSeason.update({
          where: { id: season.id },
          data: { frozen: true },
        }),
        prisma.auditLog.create({
          data: {
            actorId: 'system:cron',
            action: 'contest.freeze',
            target: `contestseason:${season.id}`,
            payload: {
              name: season.name,
              closesAt: season.closesAt.toISOString(),
              frozenAt: now.toISOString(),
            },
          },
        }),
      ])

      results.push({ id: season.id, name: season.name, ok: true })
    } catch (err) {
      console.error(`[freeze-seasons] seasonId=${season.id} 동결 실패:`, err)
      results.push({
        id: season.id,
        name: season.name,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  console.warn(`[freeze-seasons] 완료: ${succeeded}개 동결, ${failed}개 실패`, now.toISOString())

  return NextResponse.json({
    ok: true,
    frozenCount: succeeded,
    failedCount: failed,
    results,
    at: now.toISOString(),
  })
}
