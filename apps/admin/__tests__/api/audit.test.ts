/**
 * /api/audit + /api/audit/[id] Route Handler 단위 테스트
 *
 * prisma + auth mock.
 * 페이지네이션 / 필터 / 검색 / facets / 권한 검증.
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

const mockAuditLogFindMany = vi.fn()
const mockAuditLogCount = vi.fn()
const mockAuditLogGroupBy = vi.fn()
const mockAuditLogFindUnique = vi.fn()
const mockUserFindMany = vi.fn()
const mockUserFindUnique = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: mockAuditLogFindMany,
      count: mockAuditLogCount,
      groupBy: mockAuditLogGroupBy,
      findUnique: mockAuditLogFindUnique,
    },
    user: {
      findMany: mockUserFindMany,
      findUnique: mockUserFindUnique,
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: vi.fn() }),
}))

let mockSession: { user: { id: string } } | null = null
let mockAdminUser: {
  id: string
  email: string
  role: string
  totpVerified: boolean
  totpSetup: boolean
} | null = null

vi.mock('../../src/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
    getAdminUser: vi.fn().mockImplementation(() => Promise.resolve(mockAdminUser)),
  }
})

// ─── 샘플 데이터 ─────────────────────────────────────────────────────────────

const SAMPLE_LOG = {
  id: 'audit-1',
  actorId: 'user-1',
  action: 'create',
  target: 'format:fmt-1',
  payload: { meta: { name: 'B5' } },
  at: new Date('2026-01-01T10:00:00Z'),
}

const SAMPLE_USER = { id: 'user-1', email: 'admin@test.com' }

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeRequest(method: string, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3001/api/audit')
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }
  }
  return {
    method,
    nextUrl: url,
    json: vi.fn(),
  } as unknown as NextRequest
}

function makeRequestWithId(id: string) {
  const url = new URL(`http://localhost:3001/api/audit/${id}`)
  return {
    method: 'GET',
    nextUrl: url,
    json: vi.fn(),
  } as unknown as NextRequest
}

// ─── GET /api/audit ───────────────────────────────────────────────────────────

describe('GET /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogFindMany.mockResolvedValue([SAMPLE_LOG])
    mockAuditLogCount.mockResolvedValue(1)
    mockAuditLogGroupBy.mockResolvedValue([])
    mockUserFindMany.mockResolvedValue([SAMPLE_USER])
    vi.resetModules()
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/audit/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/audit/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 는 GET 에 성공한다 (200)',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/audit/route')
      const res = await GET(makeRequest('GET'))
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[]; totalCount: number }
      expect(body.data).toHaveLength(1)
      expect(body.totalCount).toBe(1)
    },
  )

  it('응답에 actorEmail 이 포함된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: Array<{ actorEmail: string; entityType: string; entityId: string }>
    }
    expect(body.data[0]?.actorEmail).toBe('admin@test.com')
    expect(body.data[0]?.entityType).toBe('format')
    expect(body.data[0]?.entityId).toBe('fmt-1')
  })

  it('응답에 facets 가 포함된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      facets: { byActor: unknown; byEntityType: unknown; byAction: unknown }
    }
    expect(body.facets).toHaveProperty('byActor')
    expect(body.facets).toHaveProperty('byEntityType')
    expect(body.facets).toHaveProperty('byAction')
  })

  it('페이지네이션 파라미터가 prisma 에 전달된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    await GET(makeRequest('GET', { page: '2', pageSize: '10' }))
    // findMany 가 skip=20, take=10 으로 호출되었는지 확인
    const callArgs = mockAuditLogFindMany.mock.calls[0]?.[0] as
      | { skip: number; take: number }
      | undefined
    expect(callArgs?.skip).toBe(20)
    expect(callArgs?.take).toBe(10)
  })

  it('action 필터가 where 조건에 포함된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    await GET(makeRequest('GET', { action: 'create,update' }))
    const callArgs = mockAuditLogFindMany.mock.calls[0]?.[0] as
      | { where?: { AND?: unknown[] } }
      | undefined
    const where = callArgs?.where
    expect(where).toBeDefined()
    // AND 조건 중 action 필터가 있는지 확인
    const andClauses = (where as { AND?: Array<{ action?: { in: string[] } }> })?.AND ?? []
    const actionClause = andClauses.find((c) => c.action !== undefined)
    expect(actionClause?.action).toMatchObject({ in: ['create', 'update'] })
  })

  it('entityType 필터가 target startsWith 로 변환된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    await GET(makeRequest('GET', { entityType: 'Format' }))
    const callArgs = mockAuditLogFindMany.mock.calls[0]?.[0] as
      | {
          where?: { AND?: Array<{ OR?: Array<{ target?: { startsWith: string } }> }> }
        }
      | undefined
    const andClauses = callArgs?.where?.AND ?? []
    const orClause = andClauses.find((c) => c.OR !== undefined)
    expect(orClause?.OR?.[0]?.target).toMatchObject({ startsWith: 'format:' })
  })

  it('날짜 범위 필터 — from/to 가 at 필드에 적용된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    await GET(
      makeRequest('GET', {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T23:59:59Z',
      }),
    )
    const callArgs = mockAuditLogFindMany.mock.calls[0]?.[0] as
      | {
          where?: { AND?: Array<{ at?: { gte?: Date; lte?: Date } }> }
        }
      | undefined
    const andClauses = callArgs?.where?.AND ?? []
    const dateClause = andClauses.find((c) => c.at !== undefined)
    expect(dateClause?.at?.gte).toBeInstanceOf(Date)
    expect(dateClause?.at?.lte).toBeInstanceOf(Date)
  })

  it('pageSize 는 200 을 초과하지 않는다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/audit/route')
    await GET(makeRequest('GET', { pageSize: '9999' }))
    const callArgs = mockAuditLogFindMany.mock.calls[0]?.[0] as { take: number } | undefined
    expect(callArgs?.take).toBe(200)
  })
})

// ─── GET /api/audit/[id] ─────────────────────────────────────────────────────

describe('GET /api/audit/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogFindUnique.mockResolvedValue(SAMPLE_LOG)
    mockUserFindUnique.mockResolvedValue(SAMPLE_USER)
    vi.resetModules()
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/audit/[id]/route')
    const res = await GET(makeRequestWithId('audit-1'), {
      params: Promise.resolve({ id: 'audit-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/audit/[id]/route')
    const res = await GET(makeRequestWithId('audit-1'), {
      params: Promise.resolve({ id: 'audit-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('존재하지 않는 ID → 404', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    mockAuditLogFindUnique.mockResolvedValue(null)
    const { GET } = await import('../../app/api/audit/[id]/route')
    const res = await GET(makeRequestWithId('non-existent'), {
      params: Promise.resolve({ id: 'non-existent' }),
    })
    expect(res.status).toBe(404)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 는 단건 조회에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/audit/[id]/route')
      const res = await GET(makeRequestWithId('audit-1'), {
        params: Promise.resolve({ id: 'audit-1' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        id: string
        entityType: string
        entityId: string
        actorEmail: string
      }
      expect(body.id).toBe('audit-1')
      expect(body.entityType).toBe('format')
      expect(body.entityId).toBe('fmt-1')
      expect(body.actorEmail).toBe('admin@test.com')
    },
  )

  it('audit 에 PATCH/DELETE 핸들러가 없다', async () => {
    // route 모듈에 PATCH, DELETE 가 export 되지 않아야 함
    const routeModule = await import('../../app/api/audit/[id]/route')
    expect((routeModule as Record<string, unknown>)['PATCH']).toBeUndefined()
    expect((routeModule as Record<string, unknown>)['DELETE']).toBeUndefined()
  })

  it('목록 route 에 PATCH/DELETE 핸들러가 없다', async () => {
    const routeModule = await import('../../app/api/audit/route')
    expect((routeModule as Record<string, unknown>)['PATCH']).toBeUndefined()
    expect((routeModule as Record<string, unknown>)['DELETE']).toBeUndefined()
    expect((routeModule as Record<string, unknown>)['POST']).toBeUndefined()
  })
})
