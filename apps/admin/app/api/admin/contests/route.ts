/**
 * POST /api/admin/contests — 공모전 시즌 생성
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../src/lib/audit'
import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

const CreateContestBody = z.object({
  name: z.string().min(1).max(200),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  resultsAt: z.string().datetime().nullable().optional(),
  rules: z.string().min(1),
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

  const parsed = CreateContestBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '입력값 오류' },
      { status: 422 },
    )
  }

  const { name, opensAt, closesAt, resultsAt, rules } = parsed.data
  if (new Date(closesAt) <= new Date(opensAt)) {
    return NextResponse.json({ error: '종료일이 시작일보다 이후여야 합니다.' }, { status: 422 })
  }

  try {
    const season = await prisma.contestSeason.create({
      data: {
        name,
        rules,
        opensAt: new Date(opensAt),
        closesAt: new Date(closesAt),
        resultsAt: resultsAt ? new Date(resultsAt) : null,
      },
    })
    await recordAudit({
      actorId: adminUser.id,
      action: 'create',
      entityType: 'ContestSeason',
      entityId: season.id,
      meta: { name },
    })
    return NextResponse.json({ id: season.id }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/contests] create failed:', err)
    return NextResponse.json({ error: '시즌 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
