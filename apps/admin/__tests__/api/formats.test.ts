/**
 * /api/formats Route Handler 단위 테스트
 *
 * prisma + Supabase getSession/getAdminUser mock.
 * 권한 매트릭스 (4 role × 4 액션) + Zod 검증 + 비즈니스 규칙 검증.
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

const mockFormatCreate = vi.fn()
const mockFormatFindMany = vi.fn()
const mockFormatFindUnique = vi.fn()
const mockFormatCount = vi.fn()
const mockFormatUpdate = vi.fn()
const mockFormatDelete = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    format: {
      create: mockFormatCreate,
      findMany: mockFormatFindMany,
      findUnique: mockFormatFindUnique,
      count: mockFormatCount,
      update: mockFormatUpdate,
      delete: mockFormatDelete,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}))

// next/navigation mock (redirect)
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// next/headers mock
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: vi.fn() }),
}))

// Supabase mock — getSession / getAdminUser
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

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3001/api/formats')
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }
  }
  return {
    method,
    nextUrl: url,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeRequestWithId(method: string, id: string, body?: unknown) {
  const req = makeRequest(method, body)
  return {
    req,
    params: Promise.resolve({ id }),
  }
}

const SAMPLE_FORMAT = {
  id: 'fmt-1',
  name: 'B5 단행본',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
  gridDef: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { templates: 0, projects: 0 },
}

const VALID_BODY = {
  name: 'B5 단행본',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
  gridDef: {},
}

// ─── GET /api/formats ─────────────────────────────────────────────────────────

describe('GET /api/formats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindMany.mockResolvedValue([SAMPLE_FORMAT])
    mockFormatCount.mockResolvedValue(1)
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/formats/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/formats/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 GET 에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/formats/route')
      const res = await GET(makeRequest('GET'))
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[]; totalCount: number }
      expect(body.data).toHaveLength(1)
    },
  )
})

// ─── POST /api/formats ────────────────────────────────────────────────────────

describe('POST /api/formats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindUnique.mockResolvedValue(null)
    mockFormatCreate.mockResolvedValue(SAMPLE_FORMAT)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('readonly 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(403)
  })

  it('support 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'support',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 POST 에 성공한다 (201)', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(201)
  })

  it('Zod 검증 실패 → 400', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', { name: 'x', widthMm: 10 })) // widthMm < 50
    expect(res.status).toBe(400)
  })

  it('이름 중복 → 409', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockFormatFindUnique.mockResolvedValue(SAMPLE_FORMAT) // 이미 존재
    const { POST } = await import('../../app/api/formats/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(409)
  })
})

// ─── GET /api/formats/[id] ────────────────────────────────────────────────────

describe('GET /api/formats/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindUnique.mockResolvedValue(SAMPLE_FORMAT)
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
    mockFormatFindUnique.mockResolvedValue(null)
    const { GET } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('GET', 'non-existent')
    const res = await GET(req, { params })
    expect(res.status).toBe(404)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 단건 조회에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/formats/[id]/route')
      const { req, params } = makeRequestWithId('GET', 'fmt-1')
      const res = await GET(req, { params })
      expect(res.status).toBe(200)
    },
  )
})

// ─── PATCH /api/formats/[id] ─────────────────────────────────────────────────

describe('PATCH /api/formats/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindUnique.mockResolvedValue(SAMPLE_FORMAT)
    mockFormatUpdate.mockResolvedValue(SAMPLE_FORMAT)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('readonly 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { PATCH } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'fmt-1', { name: '변경됨' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
  })

  it('support 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'support',
      totpVerified: true,
      totpSetup: true,
    }
    const { PATCH } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'fmt-1', { name: '변경됨' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 PATCH 에 성공한다', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    // 1차: 기존 레코드 조회 (존재) → 2차: 이름 중복 확인 (없음)
    mockFormatFindUnique.mockResolvedValueOnce(SAMPLE_FORMAT).mockResolvedValueOnce(null)
    const { PATCH } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'fmt-1', { name: '변경됨' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
  })

  it('존재하지 않는 ID → 404', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockFormatFindUnique.mockResolvedValue(null)
    const { PATCH } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'non-existent', { name: '변경됨' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/formats/[id] ────────────────────────────────────────────────

describe('DELETE /api/formats/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindUnique.mockResolvedValue({
      ...SAMPLE_FORMAT,
      _count: { templates: 0, projects: 0 },
    })
    mockFormatDelete.mockResolvedValue(SAMPLE_FORMAT)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('superadmin 만 DELETE 가능 — curator 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'fmt-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
  })

  it('support 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'support',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'fmt-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
  })

  it('readonly 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'fmt-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
  })

  it('superadmin — 사용 중 아닌 판형 삭제 성공 (204)', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'fmt-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
  })

  it('사용 중인 판형 삭제 → 409', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockFormatFindUnique.mockResolvedValue({
      ...SAMPLE_FORMAT,
      _count: { templates: 3, projects: 1 },
    })
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'fmt-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(409)
  })

  it('존재하지 않는 ID → 404', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockFormatFindUnique.mockResolvedValue(null)
    const { DELETE } = await import('../../app/api/formats/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'non-existent')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })
})
