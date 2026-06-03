/**
 * PATCH /api/admin/comments/[id] — 댓글 isDeleted 토글
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

const PatchBody = z.object({ isDeleted: z.boolean() })

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.comment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '입력값 오류' }, { status: 422 })

  try {
    const updated = await prisma.comment.update({
      where: { id },
      data: { isDeleted: parsed.data.isDeleted },
    })
    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'Comment',
      entityId: id,
      diff: { isDeleted: { before: existing.isDeleted, after: updated.isDeleted } },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/comments/[id]] patch failed:', err)
    return NextResponse.json({ error: '댓글 업데이트 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
