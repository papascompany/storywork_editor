/**
 * POST /api/reports — 신고 접수 (BOARD-07)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetUser, mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createWebServerClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/users', () => ({ getCurrentUser: mockGetCurrentUser }))

const { mockShowcaseFind, mockCommentFind, mockReportCreateMany } = vi.hoisted(() => ({
  mockShowcaseFind: vi.fn(),
  mockCommentFind: vi.fn(),
  mockReportCreateMany: vi.fn(),
}))
vi.mock('../app/api/_lib/prisma', () => ({
  getPrismaClient: () => ({
    showcase: { findUnique: mockShowcaseFind },
    comment: { findUnique: mockCommentFind },
    report: { createMany: mockReportCreateMany },
  }),
}))

function req(body: unknown): Request {
  return new Request('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID = { targetType: 'showcase', targetId: 'sc1', reason: 'spam' }

describe('POST /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'au', email: 'a@b.com' } } })
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' })
    mockShowcaseFind.mockResolvedValue({ id: 'sc1' })
    mockCommentFind.mockResolvedValue({ id: 'cm1' })
    mockReportCreateMany.mockResolvedValue({ count: 1 })
  })

  async function call(body: unknown) {
    const { POST } = await import('../app/api/reports/route')
    return POST(req(body))
  }

  it('미인증 → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await call(VALID)
    expect(res.status).toBe(401)
    expect(mockReportCreateMany).not.toHaveBeenCalled()
  })

  it('유효 신고 → 201 + reporterId 는 세션에서 유도', async () => {
    const res = await call({ ...VALID, reporterId: 'attacker' })
    expect(res.status).toBe(201)
    const arg = mockReportCreateMany.mock.calls[0]?.[0] as { data: { reporterId: string } }
    expect(arg.data.reporterId).toBe('u1')
    expect(arg.data.reporterId).not.toBe('attacker')
  })

  it('대상 미존재 → 404', async () => {
    mockShowcaseFind.mockResolvedValue(null)
    const res = await call(VALID)
    expect(res.status).toBe(404)
  })

  it('중복 신고(count=0) → 201 + alreadyReported=true (멱등)', async () => {
    mockReportCreateMany.mockResolvedValue({ count: 0 })
    const res = await call(VALID)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { alreadyReported: boolean }
    expect(body.alreadyReported).toBe(true)
  })

  it('잘못된 사유 → 422', async () => {
    const res = await call({ ...VALID, reason: 'invalid-reason' })
    expect(res.status).toBe(422)
  })

  it('comment 대상도 검증한다', async () => {
    await call({ targetType: 'comment', targetId: 'cm1', reason: 'abuse' })
    expect(mockCommentFind).toHaveBeenCalledWith({ where: { id: 'cm1' }, select: { id: true } })
  })
})
