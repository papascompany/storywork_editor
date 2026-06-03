/**
 * PATCH /api/admin/inquiries/[id] — 문의 답변 + 상태 변경
 */
import { AdminReplyInquirySchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('support')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.inquiry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '문의를 찾을 수 없습니다.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = AdminReplyInquirySchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const { adminReply, status } = parsed.data

  try {
    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        adminReply,
        repliedAt: new Date(),
        ...(status ? { status } : { status: 'REPLIED' }),
      },
    })

    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'Inquiry',
      entityId: id,
      diff: {
        status: { before: existing.status, after: updated.status },
      },
    })

    return NextResponse.json({ id: updated.id })
  } catch (err) {
    console.error('[api/admin/inquiries/[id]] patch failed:', err)
    return NextResponse.json({ error: '답변 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
