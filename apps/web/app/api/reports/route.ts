/**
 * POST /api/reports — 신고 접수 (BOARD-07)
 *
 * - 로그인 필수 (남용 방지 — 게스트 신고 비허용)
 * - 대상(showcase|comment) 존재 검증
 * - 같은 사용자가 같은 대상 재신고 시 멱등 (createMany skipDuplicates 패턴)
 * - 작성자 id 는 세션에서만 유도 (바디 신뢰 금지)
 */
/* eslint-disable import/order */
import { CreateReportSchema } from '@storywork/schema'
import { NextResponse } from 'next/server'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'
import { getPrismaClient } from '../_lib/prisma'
/* eslint-enable import/order */

export async function POST(request: Request): Promise<NextResponse> {
  // 1. 인증 — 로그인 필수
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser?.email) {
    return NextResponse.json({ error: '신고하려면 로그인이 필요합니다.' }, { status: 401 })
  }
  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  if (!dbUser) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 2. 바디 검증
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const parsed = CreateReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 422 })
  }
  const { targetType, targetId, reason, detail } = parsed.data

  const prisma = getPrismaClient()

  // 3. 대상 존재 검증
  const exists =
    targetType === 'showcase'
      ? await prisma.showcase.findUnique({ where: { id: targetId }, select: { id: true } })
      : await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } })
  if (!exists) {
    return NextResponse.json({ error: '신고 대상을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 4. 멱등 생성 — ON CONFLICT DO NOTHING (중복 신고 무시)
  try {
    const created = await prisma.report.createMany({
      data: { targetType, targetId, reason, detail: detail ?? null, reporterId: dbUser.id },
      skipDuplicates: true,
    })
    // created.count===0 이면 이미 신고함 — UX 상 동일하게 성공 응답
    return NextResponse.json({ ok: true, alreadyReported: created.count === 0 }, { status: 201 })
  } catch (err) {
    console.error('[api/reports] create failed:', err)
    return NextResponse.json({ error: '신고 접수 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
