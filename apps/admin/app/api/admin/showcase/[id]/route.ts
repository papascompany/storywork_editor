/**
 * DELETE /api/admin/showcase/[id] — 쇼케이스 강제 삭제
 */
import { NextResponse } from 'next/server'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.showcase.findUnique({
    where: { id },
    include: { project: { select: { title: true } } },
  })
  if (!existing)
    return NextResponse.json({ error: '쇼케이스를 찾을 수 없습니다.' }, { status: 404 })

  try {
    await prisma.showcase.delete({ where: { id } })
    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Showcase',
      entityId: id,
      meta: { title: existing.project.title },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/showcase/[id]] delete failed:', err)
    return NextResponse.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
