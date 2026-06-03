/**
 * GET  /api/admin/characters — 캐릭터 목록 조회
 * POST /api/admin/characters — 신규 캐릭터 생성
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../src/lib/audit'
import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

const CreateCharacterBody = z.object({
  ownerType: z.enum(['system', 'creator']),
  ownerId: z.string().cuid().nullable().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(1000).optional(),
  bodyType: z.string().min(1),
  styleTag: z.string().max(100).optional(),
  thumbnail: z.string().url().optional(),
  status: z.enum(['draft', 'review', 'published', 'rejected']).default('draft'),
})

export async function GET(): Promise<NextResponse> {
  try {
    await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const characters = await prisma.character.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { poses: true } },
    },
  })

  return NextResponse.json({ characters })
}

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

  const parsed = CreateCharacterBody.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const data = parsed.data

  // creator 소유는 ownerId 필수
  if (data.ownerType === 'creator' && !data.ownerId) {
    return NextResponse.json(
      { error: 'ownerType=creator 인 경우 ownerId 가 필수입니다.' },
      { status: 422 },
    )
  }

  try {
    const character = await prisma.character.create({
      data: {
        ownerType: data.ownerType,
        ownerId: data.ownerId ?? null,
        name: data.name,
        description: data.description ?? null,
        bodyType: data.bodyType,
        styleTag: data.styleTag ?? null,
        thumbnail: data.thumbnail ?? null,
        status: data.status,
      },
    })

    await recordAudit({
      actorId: adminUser.id,
      action: 'create',
      entityType: 'Character',
      entityId: character.id,
      meta: { name: data.name, ownerType: data.ownerType, bodyType: data.bodyType },
    })

    return NextResponse.json({ id: character.id }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/characters] 생성 오류:', err)
    return NextResponse.json({ error: '캐릭터 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
