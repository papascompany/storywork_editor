/**
 * /api/templates Route Handler 단위 테스트
 *
 * CRUD + 권한 매트릭스 + 비즈니스 규칙 (사용 중 set 있으면 409)
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

const mockTemplateCreate = vi.fn()
const mockTemplateFindMany = vi.fn()
const mockTemplateFindUnique = vi.fn()
const mockTemplateCount = vi.fn()
const mockTemplateUpdate = vi.fn()
const mockTemplateDelete = vi.fn()
const mockFormatFindUnique = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    template: {
      create: mockTemplateCreate,
      findMany: mockTemplateFindMany,
      findUnique: mockTemplateFindUnique,
      count: mockTemplateCount,
      update: mockTemplateUpdate,
      delete: mockTemplateDelete,
    },
    format: {
      findUnique: mockFormatFindUnique,
    },
    auditLog: {
      create: mockAuditCreate,
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

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3001/api/templates')
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
  name: 'B5',
  widthMm: 130,
  heightMm: 200,
  dpi: 300,
  bleedMm: 3,
  safeMm: 5,
}

const SAMPLE_TEMPLATE = {
  id: 'tmpl-1',
  name: '기본 2컷',
  formatId: 'fmt-1',
  format: { id: 'fmt-1', name: 'B5' },
  slots: [],
  fabricJson: {},
  thumbnail: null,
  setId: null,
  set: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const VALID_BODY = {
  name: '기본 2컷',
  formatId: 'fmt-1',
  slots: [],
  fabricJson: {},
}

// ─── GET /api/templates ───────────────────────────────────────────────────────

describe('GET /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindMany.mockResolvedValue([SAMPLE_TEMPLATE])
    mockTemplateCount.mockResolvedValue(1)
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/templates/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/templates/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 GET 에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/templates/route')
      const res = await GET(makeRequest('GET'))
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[]; totalCount: number }
      expect(body.data).toHaveLength(1)
    },
  )
})

// ─── POST /api/templates ──────────────────────────────────────────────────────

describe('POST /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormatFindUnique.mockResolvedValue(SAMPLE_FORMAT)
    mockTemplateCreate.mockResolvedValue(SAMPLE_TEMPLATE)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { POST } = await import('../../app/api/templates/route')
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
    const { POST } = await import('../../app/api/templates/route')
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
    const { POST } = await import('../../app/api/templates/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 POST 에 성공한다 (201)', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { POST } = await import('../../app/api/templates/route')
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
    const { POST } = await import('../../app/api/templates/route')
    const res = await POST(makeRequest('POST', { name: 'x', formatId: '' })) // name too short, formatId empty
    expect(res.status).toBe(400)
  })

  it('존재하지 않는 formatId → 404', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockFormatFindUnique.mockResolvedValue(null)
    const { POST } = await import('../../app/api/templates/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(404)
  })
})

// ─── GET /api/templates/[id] ─────────────────────────────────────────────────

describe('GET /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindUnique.mockResolvedValue({ ...SAMPLE_TEMPLATE, format: SAMPLE_FORMAT })
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
    mockTemplateFindUnique.mockResolvedValue(null)
    const { GET } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('GET', 'non-existent')
    const res = await GET(req, { params })
    expect(res.status).toBe(404)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 단건 조회에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/templates/[id]/route')
      const { req, params } = makeRequestWithId('GET', 'tmpl-1')
      const res = await GET(req, { params })
      expect(res.status).toBe(200)
    },
  )
})

// ─── PATCH /api/templates/[id] ───────────────────────────────────────────────

describe('PATCH /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindUnique.mockResolvedValue(SAMPLE_TEMPLATE)
    mockTemplateUpdate.mockResolvedValue({ ...SAMPLE_TEMPLATE, name: '변경됨' })
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
    const { PATCH } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'tmpl-1', { name: '변경됨' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 PATCH 에 성공한다', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { PATCH } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'tmpl-1', { name: '변경됨이름' })
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
    mockTemplateFindUnique.mockResolvedValue(null)
    const { PATCH } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'non-existent', { name: '변경됨이름' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/templates/[id] ──────────────────────────────────────────────

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindUnique.mockResolvedValue({ ...SAMPLE_TEMPLATE, set: null })
    mockTemplateDelete.mockResolvedValue(SAMPLE_TEMPLATE)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('curator 는 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'tmpl-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
  })

  it('superadmin — 삭제 성공 (204)', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { DELETE } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'tmpl-1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
  })

  it('사용 중인 set 있으면 409', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateFindUnique.mockResolvedValue({
      ...SAMPLE_TEMPLATE,
      set: { id: 'set-1', name: '기본 세트' },
    })
    const { DELETE } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'tmpl-1')
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
    mockTemplateFindUnique.mockResolvedValue(null)
    const { DELETE } = await import('../../app/api/templates/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'non-existent')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })
})
