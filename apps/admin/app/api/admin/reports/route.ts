/**
 * GET /api/admin/reports — 신고 큐 목록 (BOARD-07)
 *
 * - curator 이상
 * - status 필터 (기본 pending)
 * - 각 신고에 대상 미리보기 + 같은 대상 신고 누적 건수 포함
 */
import { NextResponse } from 'next/server'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

const VALID_STATUS = ['pending', 'reviewing', 'resolved', 'dismissed', 'all'] as const

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status') ?? 'pending'
  const status = (VALID_STATUS as readonly string[]).includes(statusParam) ? statusParam : 'pending'
  const page = Math.max(0, Number(url.searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '30')))

  const where = status === 'all' ? {} : { status: status as 'pending' }

  const [reports, totalCount] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: { reporter: { select: { name: true, email: true } } },
    }),
    prisma.report.count({ where }),
  ])

  // 대상 미리보기 + 같은 대상 누적 신고 수 (N+1 회피: 그룹 조회)
  const showcaseIds = reports.filter((r) => r.targetType === 'showcase').map((r) => r.targetId)
  const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId)

  const [showcases, comments, groupCounts] = await Promise.all([
    showcaseIds.length
      ? prisma.showcase.findMany({
          where: { id: { in: showcaseIds } },
          select: { id: true, hidden: true, project: { select: { title: true } } },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, body: true, isDeleted: true },
        })
      : Promise.resolve([]),
    prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: {
        OR: [
          ...(showcaseIds.length
            ? [{ targetType: 'showcase' as const, targetId: { in: showcaseIds } }]
            : []),
          ...(commentIds.length
            ? [{ targetType: 'comment' as const, targetId: { in: commentIds } }]
            : []),
        ],
      },
      _count: { _all: true },
    }),
  ])

  const showcaseMap = new Map(showcases.map((s) => [s.id, s]))
  const commentMap = new Map(comments.map((c) => [c.id, c]))
  const countMap = new Map(groupCounts.map((g) => [`${g.targetType}:${g.targetId}`, g._count._all]))

  const data = reports.map((r) => {
    let preview = '(대상 없음 — 이미 삭제됨)'
    let targetHidden = false
    if (r.targetType === 'showcase') {
      const s = showcaseMap.get(r.targetId)
      if (s) {
        preview = s.project.title
        targetHidden = s.hidden
      }
    } else {
      const c = commentMap.get(r.targetId)
      if (c) {
        preview = c.body.slice(0, 80)
        targetHidden = c.isDeleted
      }
    }
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      preview,
      targetHidden,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolution: r.resolution,
      reporterName: r.reporter?.name ?? r.reporter?.email ?? '(탈퇴 사용자)',
      reportCount: countMap.get(`${r.targetType}:${r.targetId}`) ?? 1,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data, totalCount })
}
