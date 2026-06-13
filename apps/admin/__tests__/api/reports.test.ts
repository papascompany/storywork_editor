/**
 * /api/admin/reports[/id] — 신고 큐 + 처리 (BOARD-07)
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRequireRole, mockRecordAudit } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockRecordAudit: vi.fn(),
}))
vi.mock('../../src/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, requireRole: mockRequireRole }
})
vi.mock('../../src/lib/audit', () => ({ recordAudit: mockRecordAudit }))

const m = vi.hoisted(() => ({
  reportFindMany: vi.fn(),
  reportCount: vi.fn(),
  reportFindUnique: vi.fn(),
  reportUpdate: vi.fn(),
  reportUpdateMany: vi.fn(),
  reportGroupBy: vi.fn(),
  showcaseFindMany: vi.fn(),
  showcaseUpdate: vi.fn(),
  commentFindMany: vi.fn(),
  commentUpdate: vi.fn(),
}))
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    report: {
      findMany: m.reportFindMany,
      count: m.reportCount,
      findUnique: m.reportFindUnique,
      update: m.reportUpdate,
      updateMany: m.reportUpdateMany,
      groupBy: m.reportGroupBy,
    },
    showcase: { findMany: m.showcaseFindMany, update: m.showcaseUpdate },
    comment: { findMany: m.commentFindMany, update: m.commentUpdate },
  },
}))

function getReq(status = 'pending'): Request {
  return new Request(`http://localhost:3001/api/admin/reports?status=${status}`)
}
function patchReq(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

const ADMIN = { id: 'admin1', role: 'curator' }

describe('GET /api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireRole.mockResolvedValue(ADMIN)
    m.reportFindMany.mockResolvedValue([
      {
        id: 'r1',
        targetType: 'showcase',
        targetId: 'sc1',
        reason: 'spam',
        detail: null,
        status: 'pending',
        resolution: null,
        reporter: { name: '홍길동', email: 'h@b.com' },
        createdAt: new Date(),
        reviewedAt: null,
      },
    ])
    m.reportCount.mockResolvedValue(1)
    m.showcaseFindMany.mockResolvedValue([
      { id: 'sc1', hidden: false, project: { title: '내 작품' } },
    ])
    m.commentFindMany.mockResolvedValue([])
    m.reportGroupBy.mockResolvedValue([
      { targetType: 'showcase', targetId: 'sc1', _count: { _all: 3 } },
    ])
  })

  it('권한 없으면 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('forbidden'))
    const { GET } = await import('../../app/api/admin/reports/route')
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('목록 + 대상 미리보기 + 누적 신고 수 반환', async () => {
    const { GET } = await import('../../app/api/admin/reports/route')
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { preview: string; reportCount: number }[] }
    expect(body.data[0]?.preview).toBe('내 작품')
    expect(body.data[0]?.reportCount).toBe(3)
  })
})

describe('PATCH /api/admin/reports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireRole.mockResolvedValue(ADMIN)
    m.reportFindUnique.mockResolvedValue({
      id: 'r1',
      targetType: 'showcase',
      targetId: 'sc1',
      status: 'pending',
    })
    m.showcaseUpdate.mockResolvedValue({ id: 'sc1', hidden: true })
    m.reportUpdate.mockResolvedValue({})
    m.reportUpdateMany.mockResolvedValue({ count: 3 })
  })

  async function patch(body: unknown, id = 'r1') {
    const { PATCH } = await import('../../app/api/admin/reports/[id]/route')
    return PATCH(patchReq(body), { params: Promise.resolve({ id }) })
  }

  it('권한 없으면 403', async () => {
    mockRequireRole.mockRejectedValue(new Error('forbidden'))
    const res = await patch({ action: 'hide' })
    expect(res.status).toBe(403)
  })

  it('hide → showcase.hidden=true + 같은 대상 신고 resolved', async () => {
    const res = await patch({ action: 'hide' })
    expect(res.status).toBe(200)
    expect(m.showcaseUpdate).toHaveBeenCalledWith({ where: { id: 'sc1' }, data: { hidden: true } })
    const upd = m.reportUpdateMany.mock.calls[0]?.[0] as { data: { status: string } }
    expect(upd.data.status).toBe('resolved')
  })

  it('comment 대상 hide → comment.isDeleted=true', async () => {
    m.reportFindUnique.mockResolvedValue({
      id: 'r2',
      targetType: 'comment',
      targetId: 'cm1',
      status: 'pending',
    })
    m.commentUpdate.mockResolvedValue({ id: 'cm1', isDeleted: true })
    const res = await patch({ action: 'hide' }, 'r2')
    expect(res.status).toBe(200)
    expect(m.commentUpdate).toHaveBeenCalledWith({
      where: { id: 'cm1' },
      data: { isDeleted: true },
    })
  })

  it('dismiss → 대상 변경 없이 dismissed', async () => {
    const res = await patch({ action: 'dismiss' })
    expect(res.status).toBe(200)
    expect(m.showcaseUpdate).not.toHaveBeenCalled()
    const upd = m.reportUpdateMany.mock.calls[0]?.[0] as { data: { status: string } }
    expect(upd.data.status).toBe('dismissed')
  })

  it('존재하지 않는 신고 → 404', async () => {
    m.reportFindUnique.mockResolvedValue(null)
    const res = await patch({ action: 'hide' })
    expect(res.status).toBe(404)
  })
})
