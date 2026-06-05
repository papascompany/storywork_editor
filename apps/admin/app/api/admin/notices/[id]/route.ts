/**
 * PATCH /api/admin/notices/[id] — 공지사항 수정
 * DELETE /api/admin/notices/[id] — 공지사항 삭제
 */
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

const UpdateNoticeBody = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  publish: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.notice.findUnique({ where: { id } })
  if (!existing)
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = UpdateNoticeBody.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const { title, body: noticeBody, isPinned, publish } = parsed.data

  try {
    const updated = await prisma.notice.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(noticeBody !== undefined ? { body: noticeBody } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
        ...(publish !== undefined
          ? { publishedAt: publish ? (existing.publishedAt ?? new Date()) : null }
          : {}),
      },
    })

    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'Notice',
      entityId: updated.id,
      diff: { title: { before: existing.title, after: updated.title } },
    })

    // /notices 캐시 즉시 무효화
    revalidateTag('notices')

    return NextResponse.json({ id: updated.id })
  } catch (err) {
    console.error('[api/admin/notices/[id]] update failed:', err)
    return NextResponse.json({ error: '공지사항 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('superadmin')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.notice.findUnique({ where: { id } })
  if (!existing)
    return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })

  try {
    await prisma.notice.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Notice',
      entityId: id,
      meta: { title: existing.title },
    })

    // /notices 캐시 즉시 무효화
    revalidateTag('notices')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/notices/[id]] delete failed:', err)
    return NextResponse.json({ error: '공지사항 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
