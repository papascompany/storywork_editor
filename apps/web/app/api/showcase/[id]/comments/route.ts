/**
 * POST /api/showcase/[id]/comments — 댓글 등록
 *
 * 로그인 필수.
 */
import { CreateCommentSchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { publicDisplayName } from '@/lib/display-name'
import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id: showcaseId } = await params

  // 인증
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  if (!dbUser) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 401 })
  }

  // showcase 존재 확인
  const showcase = await prisma.showcase.findUnique({
    where: { id: showcaseId },
    select: { id: true },
  })
  if (!showcase) {
    return NextResponse.json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 본문 파싱
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const parsed = CreateCommentSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    const firstError = issues[0]?.message ?? '입력값이 올바르지 않습니다.'
    return NextResponse.json({ error: firstError }, { status: 422 })
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        showcaseId,
        userId: dbUser.id,
        body: parsed.data.body,
      },
      include: { user: { select: { name: true, email: true } } },
    })

    return NextResponse.json(
      {
        id: comment.id,
        body: comment.body,
        authorName: publicDisplayName(comment.user.name, comment.user.email),
        createdAt: comment.createdAt.toISOString(),
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[api/showcase/comments] create failed:', err)
    return NextResponse.json({ error: '댓글 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
