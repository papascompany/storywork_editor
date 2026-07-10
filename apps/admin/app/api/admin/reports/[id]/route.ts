/**
 * PATCH /api/admin/reports/[id] — 신고 처리 (BOARD-07)
 *
 * action:
 *   - 'hide'      → 대상 숨김(showcase.hidden / comment.isDeleted) + status=resolved
 *   - 'dismiss'   → 기각 (status=dismissed, 대상 변경 없음)
 *   - 'reviewing' → 검토 중 표시
 * 동일 대상의 pending 신고를 함께 정리(같은 처리 적용)한다.
 */
import { UpdateReportSchema } from '@storywork/schema'
import { NextResponse } from 'next/server'

import { recordAudit } from '../../../../../src/lib/audit'
import { requireRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  let adminUser
  try {
    adminUser = await requireRole('curator')
  } catch {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) {
    return NextResponse.json({ error: '신고를 찾을 수 없습니다.' }, { status: 404 })
  }
  // 이미 종결(resolved/dismissed)된 신고는 재처리 금지 — 상태 불일치·중복 부작용 방지
  if (report.status === 'resolved' || report.status === 'dismissed') {
    return NextResponse.json({ error: '이미 처리된 신고입니다.' }, { status: 409 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  const parsed = UpdateReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값 오류' }, { status: 422 })
  }
  const { action, resolution } = parsed.data

  const now = new Date()

  try {
    if (action === 'reviewing') {
      await prisma.report.update({
        where: { id },
        data: { status: 'reviewing', reviewerId: adminUser.id },
      })
      await recordAudit({
        actorId: adminUser.id,
        action: 'update',
        entityType: 'Report',
        entityId: id,
        diff: { status: { before: report.status, after: 'reviewing' } },
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'hide') {
      // 1. 대상 숨김
      if (report.targetType === 'showcase') {
        await prisma.showcase
          .update({ where: { id: report.targetId }, data: { hidden: true } })
          .catch(() => null) // 대상이 이미 삭제됐을 수 있음
      } else {
        await prisma.comment
          .update({ where: { id: report.targetId }, data: { isDeleted: true } })
          .catch(() => null)
      }
      // 2. 같은 대상의 미처리 신고를 모두 resolved
      await prisma.report.updateMany({
        where: {
          targetType: report.targetType,
          targetId: report.targetId,
          status: { in: ['pending', 'reviewing'] },
        },
        data: { status: 'resolved', reviewerId: adminUser.id, reviewedAt: now, resolution },
      })
      await recordAudit({
        actorId: adminUser.id,
        action: 'update',
        entityType: 'Report',
        entityId: id,
        meta: { action: 'hide', targetType: report.targetType, targetId: report.targetId },
      })
      return NextResponse.json({ ok: true })
    }

    // dismiss (기각) — 기본
    await prisma.report.updateMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        status: { in: ['pending', 'reviewing'] },
      },
      data: { status: 'dismissed', reviewerId: adminUser.id, reviewedAt: now, resolution },
    })
    await recordAudit({
      actorId: adminUser.id,
      action: 'update',
      entityType: 'Report',
      entityId: id,
      meta: { action: 'dismiss', targetType: report.targetType, targetId: report.targetId },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/reports/[id]] patch failed:', err)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
