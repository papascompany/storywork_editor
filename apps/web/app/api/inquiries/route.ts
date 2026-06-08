/**
 * POST /api/inquiries — 1:1 문의 제출
 *
 * 비회원(userId=null) / 회원 모두 허용.
 * 이메일 발송은 COMMS-01 추후 — 현재 DB 저장만.
 */
import { CreateInquirySchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  // 작성자 id 는 세션에서만 유도한다. 클라이언트 바디의 userId 는 신뢰하지 않음
  // (타인 id 로 문의를 귀속시키는 스푸핑 방지). 비회원은 null 허용.
  let userId: string | null = null
  try {
    const supabase = await createWebServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser?.email) {
      const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
      userId = dbUser?.id ?? null
    }
  } catch {
    userId = null // 세션 조회 실패 시 게스트로 처리(문의는 비회원도 허용)
  }

  const parsed = CreateInquirySchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    const firstError = issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const { email, subject, body: inquiryBody } = parsed.data

  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        email,
        subject,
        body: inquiryBody,
        userId: userId ?? null,
        status: 'OPEN',
      },
      select: { id: true },
    })

    return NextResponse.json({ id: inquiry.id }, { status: 201 })
  } catch (err) {
    console.error('[api/inquiries] create failed:', err)
    return NextResponse.json({ error: '문의 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
