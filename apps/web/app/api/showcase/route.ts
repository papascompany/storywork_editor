/**
 * GET /api/showcase — 갤러리 목록 (cursor-based pagination)
 *
 * Query params:
 *   sort: 'latest' | 'likes' (default: 'latest')
 *   cursor: string (showcase id, optional)
 *   limit: number (default: 20, max: 50)
 */
import { NextResponse } from 'next/server'

import { publicDisplayName } from '@/lib/display-name'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') === 'likes' ? 'likes' : 'latest'
  const cursor = url.searchParams.get('cursor') ?? null
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(50, Math.max(1, limitRaw))

  const orderBy =
    sort === 'likes'
      ? [{ likes: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }]

  try {
    const items = await prisma.showcase.findMany({
      where: { hidden: false },
      orderBy,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        owner: { select: { name: true, email: true } },
        project: {
          select: { title: true, pages: { take: 1, select: { thumbnail: true } } },
        },
        _count: { select: { reactions: true, comments: true } },
      },
    })

    const mapped = items.map((s) => ({
      id: s.id,
      title: s.project.title,
      thumbnail: s.project.pages[0]?.thumbnail ?? null,
      ownerName: publicDisplayName(s.owner.name, s.owner.email),
      likes: s.likes,
      reactionCount: s._count.reactions,
      commentCount: s._count.comments,
      createdAt: s.createdAt.toISOString(),
      mode: s.mode,
      contestId: s.contestId,
    }))

    const nextCursor = items.length === limit ? (items[items.length - 1]?.id ?? null) : null

    return NextResponse.json({ items: mapped, nextCursor })
  } catch (err) {
    console.error('[api/showcase] fetch failed:', err)
    return NextResponse.json({ error: '갤러리 로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
