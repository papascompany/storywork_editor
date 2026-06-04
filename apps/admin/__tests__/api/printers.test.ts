/**
 * /api/admin/printers Route Handler 단위 테스트
 *
 * isSystem=true 삭제 방어 + 권한 매트릭스 + Zod 검증.
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

const mockPrinterCreate = vi.fn()
const mockPrinterFindMany = vi.fn()
const mockPrinterFindUnique = vi.fn()
const mockPrinterCount = vi.fn()
const mockPrinterUpdate = vi.fn()
const mockPrinterDelete = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    printerProfile: {
      create: mockPrinterCreate,
      findMany: mockPrinterFindMany,
      findUnique: mockPrinterFindUnique,
      count: mockPrinterCount,
      update: mockPrinterUpdate,
      delete: mockPrinterDelete,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
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

function makeReq(method: string, body?: unknown): NextRequest {
  return {
    method,
    nextUrl: { searchParams: new URLSearchParams() },
    json: () => Promise.resolve(body),
    headers: { get: (key: string) => (key === 'content-type' ? 'application/json' : null) },
  } as unknown as NextRequest
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

const SAMPLE_PROFILE = {
  id: 'test-id',
  slug: 'test-printer',
  name: '테스트 인쇄소',
  description: null,
  formats: [],
  bleedMinMm: 3,
  bleedMaxMm: 5,
  safeMinMm: 5,
  imageDpiMinPose: 300,
  imageDpiMinBg: 150,
  fontEmbedRequired: true,
  colorSpaces: ['rgb'],
  maxPages: null,
  customWarnings: [],
  isSystem: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: null,
}

const SYSTEM_PROFILE = { ...SAMPLE_PROFILE, isSystem: true }

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('GET /api/admin/printers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'user-1' } }
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockPrinterFindMany.mockResolvedValue([SAMPLE_PROFILE])
    mockPrinterCount.mockResolvedValue(1)
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/admin/printers/route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('admin 이면 목록 반환', async () => {
    const { GET } = await import('../../app/api/admin/printers/route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: unknown[]; totalCount: number }
    expect(json.data).toHaveLength(1)
    expect(json.totalCount).toBe(1)
  })
})

describe('POST /api/admin/printers', () => {
  const validBody = {
    slug: 'new-printer',
    name: '새 인쇄소',
    formats: [],
    bleedMinMm: 2,
    bleedMaxMm: 4,
    safeMinMm: 4,
    imageDpiMinPose: 200,
    imageDpiMinBg: 100,
    fontEmbedRequired: true,
    colorSpaces: ['rgb'],
    customWarnings: [],
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'user-1' } }
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockPrinterFindUnique.mockResolvedValue(null) // slug 중복 없음
    mockPrinterCreate.mockResolvedValue({ ...SAMPLE_PROFILE, ...validBody })
    mockAuditCreate.mockResolvedValue({})
  })

  it('readonly 는 403', async () => {
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/admin/printers/route')
    const res = await POST(makeReq('POST', validBody))
    expect(res.status).toBe(403)
  })

  it('curator+ 는 201', async () => {
    const { POST } = await import('../../app/api/admin/printers/route')
    const res = await POST(makeReq('POST', validBody))
    expect(res.status).toBe(201)
  })

  it('슬러그 중복 시 409', async () => {
    mockPrinterFindUnique.mockResolvedValue(SAMPLE_PROFILE)
    const { POST } = await import('../../app/api/admin/printers/route')
    const res = await POST(makeReq('POST', validBody))
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/admin/printers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'user-1' } }
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockAuditCreate.mockResolvedValue({})
  })

  it('isSystem=true 삭제 시 403', async () => {
    mockPrinterFindUnique.mockResolvedValue(SYSTEM_PROFILE)
    const { DELETE } = await import('../../app/api/admin/printers/[id]/route')
    const res = await DELETE(makeReq('DELETE'), makeCtx('test-id'))
    expect(res.status).toBe(403)
  })

  it('isSystem=false 삭제 시 204', async () => {
    mockPrinterFindUnique.mockResolvedValue(SAMPLE_PROFILE)
    mockPrinterDelete.mockResolvedValue(SAMPLE_PROFILE)
    const { DELETE } = await import('../../app/api/admin/printers/[id]/route')
    const res = await DELETE(makeReq('DELETE'), makeCtx('test-id'))
    expect(res.status).toBe(204)
  })

  it('superadmin 아니면 403', async () => {
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockPrinterFindUnique.mockResolvedValue(SAMPLE_PROFILE)
    const { DELETE } = await import('../../app/api/admin/printers/[id]/route')
    const res = await DELETE(makeReq('DELETE'), makeCtx('test-id'))
    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/admin/printers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'user-1' } }
    mockAdminUser = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockAuditCreate.mockResolvedValue({})
  })

  it('isSystem=true 프로필에서 slug 변경 시 403', async () => {
    mockPrinterFindUnique.mockResolvedValue(SYSTEM_PROFILE)
    const { PATCH } = await import('../../app/api/admin/printers/[id]/route')
    const res = await PATCH(makeReq('PATCH', { slug: 'new-slug' }), makeCtx('test-id'))
    expect(res.status).toBe(403)
  })

  it('isSystem=true 프로필에서 isActive 변경 허용', async () => {
    mockPrinterFindUnique.mockResolvedValue(SYSTEM_PROFILE)
    mockPrinterUpdate.mockResolvedValue({ ...SYSTEM_PROFILE, isActive: false })
    const { PATCH } = await import('../../app/api/admin/printers/[id]/route')
    const res = await PATCH(makeReq('PATCH', { isActive: false }), makeCtx('test-id'))
    expect(res.status).toBe(200)
  })
})
