/**
 * /api/resources/[id] CRUD 테스트 (GET / PATCH / DELETE)
 *
 * 권한 매트릭스 + 상태 검증
 */
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockResourceFindUnique = vi.fn()
const mockResourceUpdate = vi.fn()
const mockResourceDelete = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    resource: {
      findUnique: mockResourceFindUnique,
      update: mockResourceUpdate,
      delete: mockResourceDelete,
    },
    auditLog: { create: mockAuditCreate },
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

function makeRequest(method: string, body?: unknown) {
  return {
    method,
    nextUrl: new URL('http://localhost:3001/api/resources/res-1'),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeCtx(id = 'res-1') {
  return { params: Promise.resolve({ id }) }
}

const SAMPLE = {
  id: 'res-1',
  slug: 'test-pose',
  originalFilename: 'test.png',
  kind: 'pose',
  format: 'png',
  ownerType: 'system',
  ownerId: null,
  fileUrl: 'https://example.com/test.png',
  thumbUrl: null,
  variants: null,
  width: 750,
  height: 750,
  masterDpi: 90,
  lowDpi: true,
  meta: { action: '걷기', keypoints: [] },
  tags: ['걷기'],
  status: 'review',
  reviewer: null,
  reviewNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/resources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResourceFindUnique.mockResolvedValue(SAMPLE)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 단건 조회 성공',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/resources/[id]/route')
      const res = await GET(makeRequest('GET'), makeCtx())
      expect(res.status).toBe(200)
    },
  )

  it('존재하지 않는 ID → 404', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    mockResourceFindUnique.mockResolvedValue(null)
    const { GET } = await import('../../app/api/resources/[id]/route')
    const res = await GET(makeRequest('GET'), makeCtx('non-existent'))
    expect(res.status).toBe(404)
  })
})

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe('PATCH /api/resources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResourceFindUnique.mockResolvedValue(SAMPLE)
    mockResourceUpdate.mockResolvedValue({ ...SAMPLE, tags: ['걷기', '추가'] })
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it.each(['readonly', 'support'] as const)('%s 은 PATCH 403', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { PATCH } = await import('../../app/api/resources/[id]/route')
    const res = await PATCH(makeRequest('PATCH', { tags: ['걷기'] }), makeCtx())
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 PATCH 성공', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { PATCH } = await import('../../app/api/resources/[id]/route')
    const res = await PATCH(makeRequest('PATCH', { tags: ['걷기', '추가'] }), makeCtx())
    expect(res.status).toBe(200)
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
    const { PATCH } = await import('../../app/api/resources/[id]/route')
    // tags 가 string 이어야 하는데 number 전달
    const res = await PATCH(makeRequest('PATCH', { tags: [12345] }), makeCtx())
    expect(res.status).toBe(400)
  })
})

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/resources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResourceFindUnique.mockResolvedValue(SAMPLE)
    mockResourceDelete.mockResolvedValue(SAMPLE)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it.each(['curator', 'support', 'readonly'] as const)('%s 은 DELETE 403', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { DELETE } = await import('../../app/api/resources/[id]/route')
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
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
    const { DELETE } = await import('../../app/api/resources/[id]/route')
    const res = await DELETE(makeRequest('DELETE'), makeCtx())
    expect(res.status).toBe(204)
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
    mockResourceFindUnique.mockResolvedValue(null)
    const { DELETE } = await import('../../app/api/resources/[id]/route')
    const res = await DELETE(makeRequest('DELETE'), makeCtx('non-existent'))
    expect(res.status).toBe(404)
  })
})
