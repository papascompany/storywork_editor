/**
 * PATCH /api/admin/contests/[id] — 공모전 시즌 수정
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

const UpdateContestBody = z.object({
  name: z.string().min(1).max(200).optional(),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  resultsAt: z.string().datetime().nullable().optional(),
  rules: z.string().min(1).optional(),
})

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.contestSeason.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '시즌을 찾을 수 없습니다.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = UpdateContestBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '입력값 오류' },
      { status: 422 },
    )
  }

  const { name, opensAt, closesAt, resultsAt, rules } = parsed.data

  try {
    const updated = await prisma.contestSeason.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(opensAt !== undefined ? { opensAt: new Date(opensAt) } : {}),
        ...(closesAt !== undefined ? { closesAt: new Date(closesAt) } : {}),
        ...(resultsAt !== undefined ? { resultsAt: resultsAt ? new Date(resultsAt) : null } : {}),
        ...(rules !== undefined ? { rules } : {}),
      },
    })
    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'ContestSeason',
      entityId: updated.id,
      diff: { name: { before: existing.name, after: updated.name } },
    })
    return NextResponse.json({ id: updated.id })
  } catch (err) {
    console.error('[api/admin/contests/[id]] patch failed:', err)
    return NextResponse.json({ error: '시즌 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
