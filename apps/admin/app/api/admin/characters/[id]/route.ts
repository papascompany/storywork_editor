/**
 * GET    /api/admin/characters/[id] — 캐릭터 상세 조회
 * PATCH  /api/admin/characters/[id] — 캐릭터 수정
 * DELETE /api/admin/characters/[id] — 캐릭터 삭제
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

const PatchCharacterBody = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(1000).nullable().optional(),
  bodyType: z.string().min(1).optional(),
  styleTag: z.string().max(100).nullable().optional(),
  thumbnail: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'review', 'published', 'rejected']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      _count: { select: { poses: true } },
      poses: {
        where: { kind: 'pose' },
        select: {
          id: true,
          slug: true,
          thumbUrl: true,
          fileUrl: true,
          status: true,
          meta: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!character) {
    return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ character })
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = PatchCharacterBody.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  const existing = await prisma.character.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const updated = await prisma.character.update({
      where: { id },
      data: parsed.data,
    })

    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'Character',
      entityId: id,
      meta: { changes: parsed.data },
    })

    return NextResponse.json({ id: updated.id })
  } catch (err) {
    console.error('[api/admin/characters/[id]] 수정 오류:', err)
    return NextResponse.json({ error: '캐릭터 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('superadmin')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다. (superadmin 필요)' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.character.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 })
  }

  // system 캐릭터 삭제 보호 (더미맨 등)
  if (existing.ownerType === 'system') {
    return NextResponse.json(
      { error: 'system 캐릭터는 삭제할 수 없습니다. status=rejected 로 비활성화하세요.' },
      { status: 422 },
    )
  }

  try {
    await prisma.character.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'Character',
      entityId: id,
      meta: { name: existing.name, ownerType: existing.ownerType },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/admin/characters/[id]] 삭제 오류:', err)
    return NextResponse.json({ error: '캐릭터 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
