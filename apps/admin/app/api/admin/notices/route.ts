/**
 * POST /api/admin/notices — 공지사항 생성
 */
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../src/lib/audit'
import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

const CreateNoticeBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  isPinned: z.boolean().default(false),
  publish: z.boolean().default(false),
})

export async function POST(request: Request): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = CreateNoticeBody.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const { title, body: noticeBody, isPinned, publish } = parsed.data

  try {
    const notice = await prisma.notice.create({
      data: {
        title,
        body: noticeBody,
        isPinned,
        publishedAt: publish ? new Date() : null,
        authorId: adminUser.id,
      },
    })

    await recordAudit({
      actorId: adminUser.id,
      action: 'create',
      entityType: 'Notice',
      entityId: notice.id,
      meta: { title, isPinned, publish },
    })

    // /notices 캐시 즉시 무효화 (apps/web/lib/notices.ts 의 'notices' 태그)
    revalidateTag('notices')

    return NextResponse.json({ id: notice.id }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/notices] create failed:', err)
    return NextResponse.json({ error: '공지사항 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
