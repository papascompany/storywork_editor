/**
 * GET /api/cron/freeze-seasons — 공모전 시즌 자동 동결 (BOARD-05)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSeasonFindMany, mockSeasonUpdate, mockAuditCreate } = vi.hoisted(() => ({
  mockSeasonFindMany: vi.fn(),
  mockSeasonUpdate: vi.fn(),
  mockAuditCreate: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contestSeason: { findMany: mockSeasonFindMany, update: mockSeasonUpdate },
    auditLog: { create: mockAuditCreate },
    // $transaction([...]) — 배열 형태. 요소(이미 mock 이 평가한 promise)를 Promise.all 로 처리.
    $transaction: (ops: unknown[]) => Promise.all(ops),
  },
}))

const SECRET = 'test-cron-secret'

function req(token?: string): Request {
  return new Request('http://localhost:3000/api/cron/freeze-seasons', {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

async function call(token?: string) {
  const { GET } = await import('../app/api/cron/freeze-seasons/route')
  return GET(req(token))
}

describe('GET /api/cron/freeze-seasons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env['CRON_SECRET'] = SECRET
    mockSeasonFindMany.mockResolvedValue([])
    mockSeasonUpdate.mockResolvedValue({})
    mockAuditCreate.mockResolvedValue({})
  })
  afterEach(() => {
    delete process.env['CRON_SECRET']
  })

  it('Authorization 헤더 없음 → 401', async () => {
    const res = await call()
    expect(res.status).toBe(401)
    expect(mockSeasonFindMany).not.toHaveBeenCalled()
  })

  it('잘못된 토큰 → 401', async () => {
    const res = await call('wrong')
    expect(res.status).toBe(401)
  })

  it('CRON_SECRET 미설정 → 401 (올바른 토큰이어도)', async () => {
    delete process.env['CRON_SECRET']
    const res = await call(SECRET)
    expect(res.status).toBe(401)
  })

  it('동결 대상 없음 → 200 frozenCount=0', async () => {
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { frozenCount: number }
    expect(body.frozenCount).toBe(0)
    expect(mockSeasonUpdate).not.toHaveBeenCalled()
  })

  it('마감 시즌 동결 → frozen=true 업데이트 + audit + frozenCount', async () => {
    mockSeasonFindMany.mockResolvedValue([
      { id: 's1', name: 'A', closesAt: new Date('2026-06-01T00:00:00Z') },
      { id: 's2', name: 'B', closesAt: new Date('2026-06-02T00:00:00Z') },
    ])
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { frozenCount: number }
    expect(body.frozenCount).toBe(2)
    expect(mockSeasonUpdate).toHaveBeenCalledTimes(2)
    expect(mockSeasonUpdate).toHaveBeenCalledWith({ where: { id: 's1' }, data: { frozen: true } })
    expect(mockAuditCreate).toHaveBeenCalledTimes(2)
    const auditArg = mockAuditCreate.mock.calls[0]?.[0] as {
      data: { actorId: string; action: string; target: string }
    }
    expect(auditArg.data.actorId).toBe('system:cron')
    expect(auditArg.data.action).toBe('contest.freeze')
    expect(auditArg.data.target).toBe('contestseason:s1')
  })

  it('일부 실패 → failedCount 집계 + 200', async () => {
    mockSeasonFindMany.mockResolvedValue([
      { id: 's1', name: 'A', closesAt: new Date('2026-06-01T00:00:00Z') },
      { id: 's2', name: 'B', closesAt: new Date('2026-06-02T00:00:00Z') },
    ])
    mockSeasonUpdate.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('db error'))
    const res = await call(SECRET)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { frozenCount: number; failedCount: number }
    expect(body.frozenCount).toBe(1)
    expect(body.failedCount).toBe(1)
  })

  it('findMany 는 frozen=false + closesAt<=now 조건으로 조회', async () => {
    await call(SECRET)
    const arg = mockSeasonFindMany.mock.calls[0]?.[0] as {
      where: { frozen: boolean; closesAt: { lte: Date } }
    }
    expect(arg.where.frozen).toBe(false)
    expect(arg.where.closesAt.lte).toBeInstanceOf(Date)
  })
})
