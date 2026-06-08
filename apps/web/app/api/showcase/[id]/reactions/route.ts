/**
 * POST /api/showcase/[id]/reactions — 반응 추가
 * DELETE /api/showcase/[id]/reactions — 반응 제거
 *
 * 로그인 필수. Showcase.likes 동기화.
 */
import { ReactionKindSchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getAuthenticatedUser(_request: Request) {
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) return null

  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  return dbUser
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id: showcaseId } = await params

  const dbUser = await getAuthenticatedUser(request)
  if (!dbUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const kindParsed = ReactionKindSchema.safeParse((body as Record<string, unknown>)['kind'])
  if (!kindParsed.success) {
    return NextResponse.json({ error: '유효하지 않은 반응 종류입니다.' }, { status: 422 })
  }
  const kind = kindParsed.data

  try {
    await prisma.$transaction(async (tx) => {
      // createMany + skipDuplicates → ON CONFLICT DO NOTHING (race-safe).
      // 신규 생성된 경우(count>0)에만 likes 증가 → 중복 POST 시 카운터 inflation 방지.
      // (DELETE 의 deleted.count>0 가드와 대칭)
      const created = await tx.reaction.createMany({
        data: { showcaseId, userId: dbUser.id, kind },
        skipDuplicates: true,
      })
      if (kind === 'like' && created.count > 0) {
        await tx.showcase.update({
          where: { id: showcaseId },
          data: { likes: { increment: 1 } },
        })
      }
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[api/showcase/reactions] create failed:', err)
    return NextResponse.json({ error: '반응 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id: showcaseId } = await params

  const dbUser = await getAuthenticatedUser(request)
  if (!dbUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const kindParsed = ReactionKindSchema.safeParse((body as Record<string, unknown>)['kind'])
  if (!kindParsed.success) {
    return NextResponse.json({ error: '유효하지 않은 반응 종류입니다.' }, { status: 422 })
  }
  const kind = kindParsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.reaction.deleteMany({
        where: { showcaseId, userId: dbUser.id, kind },
      })
      if (kind === 'like' && deleted.count > 0) {
        await tx.showcase.update({
          where: { id: showcaseId },
          data: { likes: { decrement: 1 } },
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/showcase/reactions] delete failed:', err)
    return NextResponse.json({ error: '반응 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
