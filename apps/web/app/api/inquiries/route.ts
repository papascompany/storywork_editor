/**
 * POST /api/inquiries — 1:1 문의 제출
 *
 * 비회원(userId=null) / 회원 모두 허용.
 * 이메일 발송은 COMMS-01 추후 — 현재 DB 저장만.
 */
import { CreateInquirySchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  // userId 분리
  const rawBody = body as Record<string, unknown>
  const userId = typeof rawBody['userId'] === 'string' ? rawBody['userId'] : null

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
