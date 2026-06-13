/**
 * POST /api/contest/[seasonId]/submit — 공모전 출품 (BOARD-05)
 */
import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createWebServerClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/users', () => ({ getCurrentUser: mockGetCurrentUser }))

const { mockSeasonFind, mockProjectFind, mockShowcaseFindFirst, mockShowcaseCreate } = vi.hoisted(
  () => ({
    mockSeasonFind: vi.fn(),
    mockProjectFind: vi.fn(),
    mockShowcaseFindFirst: vi.fn(),
    mockShowcaseCreate: vi.fn(),
  }),
)
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contestSeason: { findUnique: mockSeasonFind },
    project: { findUnique: mockProjectFind },
    showcase: { findFirst: mockShowcaseFindFirst, create: mockShowcaseCreate },
  },
}))

const DAY = 86_400_000

function req(body: unknown): Request {
  return new Request('http://localhost:3000/api/contest/s1/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function call(body: unknown, seasonId = 's1') {
  const { POST } = await import('../app/api/contest/[seasonId]/submit/route')
  return POST(req(body), { params: Promise.resolve({ seasonId }) })
}

describe('POST /api/contest/[seasonId]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'au', email: 'a@b.com' } } })
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' })
    // 진행 중 시즌 (어제 시작 ~ 내일 마감, 미동결)
    mockSeasonFind.mockResolvedValue({
      id: 's1',
      name: '여름 공모전',
      opensAt: new Date(Date.now() - DAY),
      closesAt: new Date(Date.now() + DAY),
      frozen: false,
    })
    // 본인 소유 + 페이지 3개 + 편집중 프로젝트
    mockProjectFind.mockResolvedValue({
      id: 'p1',
      ownerId: 'u1',
      status: 'editing',
      _count: { pages: 3 },
    })
    mockShowcaseFindFirst.mockResolvedValue(null)
    mockShowcaseCreate.mockResolvedValue({ id: 'sc1' })
  })

  it('미인증 → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(401)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('projectId 누락 → 400', async () => {
    const res = await call({})
    expect(res.status).toBe(400)
  })

  it('시즌 미존재 → 404', async () => {
    mockSeasonFind.mockResolvedValue(null)
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(404)
  })

  it('출품 기간 시작 전 → 403', async () => {
    mockSeasonFind.mockResolvedValue({
      id: 's1',
      name: 'x',
      opensAt: new Date(Date.now() + DAY),
      closesAt: new Date(Date.now() + 2 * DAY),
      frozen: false,
    })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(403)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('마감(closesAt 경과) → 403', async () => {
    mockSeasonFind.mockResolvedValue({
      id: 's1',
      name: 'x',
      opensAt: new Date(Date.now() - 2 * DAY),
      closesAt: new Date(Date.now() - DAY),
      frozen: false,
    })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(403)
  })

  it('frozen=true → 403 (시간상 진행 중이어도 동결이면 차단)', async () => {
    mockSeasonFind.mockResolvedValue({
      id: 's1',
      name: 'x',
      opensAt: new Date(Date.now() - DAY),
      closesAt: new Date(Date.now() + DAY),
      frozen: true,
    })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(403)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('프로젝트 미존재 → 404', async () => {
    mockProjectFind.mockResolvedValue(null)
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(404)
  })

  it('타인 프로젝트 → 403', async () => {
    mockProjectFind.mockResolvedValue({ id: 'p1', ownerId: 'other', _count: { pages: 3 } })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(403)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('페이지 0개 프로젝트 → 400', async () => {
    mockProjectFind.mockResolvedValue({
      id: 'p1',
      ownerId: 'u1',
      status: 'editing',
      _count: { pages: 0 },
    })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(400)
  })

  it('보관(archived) 작품 → 403', async () => {
    mockProjectFind.mockResolvedValue({
      id: 'p1',
      ownerId: 'u1',
      status: 'archived',
      _count: { pages: 3 },
    })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(403)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('이미 출품한 작품 → 409', async () => {
    mockShowcaseFindFirst.mockResolvedValue({ id: 'sc-existing' })
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(409)
    expect(mockShowcaseCreate).not.toHaveBeenCalled()
  })

  it('정상 출품 → 201 + showcaseId, ownerId 는 세션에서 유도', async () => {
    const res = await call({ projectId: 'p1', ownerId: 'attacker' })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { showcaseId: string }
    expect(body.showcaseId).toBe('sc1')
    const arg = mockShowcaseCreate.mock.calls[0]?.[0] as {
      data: { ownerId: string; mode: string; contestId: string }
    }
    expect(arg.data.ownerId).toBe('u1')
    expect(arg.data.ownerId).not.toBe('attacker')
    expect(arg.data.mode).toBe('contest')
    expect(arg.data.contestId).toBe('s1')
  })

  it('동시 출품 race(P2002) → 409', async () => {
    mockShowcaseCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )
    const res = await call({ projectId: 'p1' })
    expect(res.status).toBe(409)
  })
})
