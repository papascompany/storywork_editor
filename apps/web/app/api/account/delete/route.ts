/**
 * POST /api/account/delete
 *
 * 회원 탈퇴 — soft delete 처리.
 * PIPA + GDPR 패턴: deletedAt = now(), deletionScheduledFor = now() + 30일.
 * 30일 후 hard delete cron 이 영구 삭제 (/api/cron/hard-delete-users).
 *
 * 인증 흐름:
 *   1. 현재 세션 확인
 *   2. email + password 재인증 (signInWithPassword) → 본인 확인
 *   3. User soft delete (prisma.user.update)
 *   4. audit log
 *   5. Supabase signOut
 *
 * LEGAL-OPS-03
 */
import { AccountDeleteRequestSchema } from '@storywork/schema'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const HARD_DELETE_DAYS = 30

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. 현재 세션 확인 ────────────────────────────────────────────────────────
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // ── 2. body 파싱 + 검증 ──────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const parsed = AccountDeleteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { email, password, reason } = parsed.data

  // ── 3. 본인 확인 — email 일치 확인 ───────────────────────────────────────────
  if (email.toLowerCase() !== authUser.email.toLowerCase()) {
    return NextResponse.json(
      { error: '이메일이 현재 로그인 계정과 일치하지 않습니다.' },
      { status: 403 },
    )
  }

  // ── 4. 비밀번호 재인증 (signInWithPassword) ──────────────────────────────────
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.json(
      { error: '비밀번호가 올바르지 않습니다. 다시 확인해주세요.' },
      { status: 403 },
    )
  }

  // ── 5. DB User 조회 ──────────────────────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: { id: true, deletedAt: true },
  })

  if (!dbUser) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (dbUser.deletedAt) {
    return NextResponse.json({ error: '이미 탈퇴 처리된 계정입니다.' }, { status: 409 })
  }

  // ── 6. Soft delete ───────────────────────────────────────────────────────────
  const now = new Date()
  const scheduledFor = new Date(now.getTime() + HARD_DELETE_DAYS * 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      deletedAt: now,
      deletionScheduledFor: scheduledFor,
      ...(reason ? { deletionReason: reason } : {}),
    },
  })

  // ── 7. Subscription 취소 (Stripe M7 미구현 — placeholder) ───────────────────
  // TODO(M7): Stripe.subscriptions.cancel(stripeSubscriptionId)
  // 현재는 콘솔 로그만 남김
  const activeSubs = await prisma.subscription.findMany({
    where: { userId: dbUser.id, status: 'active' },
    select: { id: true, plan: true },
  })
  if (activeSubs.length > 0) {
    console.warn(
      `[account/delete] userId=${dbUser.id} 에 활성 구독 ${activeSubs.length}건 — Stripe cancel placeholder (M7)`,
      activeSubs.map((s) => s.id),
    )
  }

  // ── 8. Audit log ─────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: 'user.self_delete',
      target: `user:${dbUser.id}`,
      payload: {
        reason: reason ?? null,
        deletedAt: now.toISOString(),
        deletionScheduledFor: scheduledFor.toISOString(),
        activeSubs: activeSubs.map((s) => s.id),
      },
    },
  })

  // ── 9. Supabase signOut ──────────────────────────────────────────────────────
  await supabase.auth.signOut()

  return NextResponse.json({
    ok: true,
    message: '탈퇴 처리가 완료되었습니다. 30일 후 모든 데이터가 영구 삭제됩니다.',
    deletedAt: now.toISOString(),
    deletionScheduledFor: scheduledFor.toISOString(),
  })
}
