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
      // upsert
      await tx.reaction.upsert({
        where: { showcaseId_userId_kind: { showcaseId, userId: dbUser.id, kind } },
        create: { showcaseId, userId: dbUser.id, kind },
        update: {},
      })
      // likes 카운트 업데이트 (like 반응만)
      if (kind === 'like') {
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
