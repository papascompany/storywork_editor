/**
 * 상태 머신 테스트: publish / reject
 *
 * 유효한 전환: draft|review → published, draft|review → rejected
 * 잘못된 전환 → 409
 */
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockResourceFindUnique = vi.fn()
const mockResourceUpdate = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    resource: {
      findUnique: mockResourceFindUnique,
      update: mockResourceUpdate,
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

function makeRequest(body?: unknown) {
  return {
    method: 'POST',
    nextUrl: new URL('http://localhost:3001/api/resources/res-1/publish'),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeCtx(id = 'res-1') {
  return { params: Promise.resolve({ id }) }
}

function makeResource(status: string) {
  return {
    id: 'res-1',
    slug: 'test-pose',
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
    tags: [],
    status,
    reviewer: null,
    reviewNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── publish ─────────────────────────────────────────────────────────────────

describe('POST /api/resources/[id]/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockResourceUpdate.mockResolvedValue({ ...makeResource('published'), status: 'published' })
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it.each(['draft', 'review'] as const)('%s → published 성공', async (status) => {
    mockResourceFindUnique.mockResolvedValue(makeResource(status))
    const { POST } = await import('../../app/api/resources/[id]/publish/route')
    const res = await POST(makeRequest(), makeCtx())
    expect(res.status).toBe(200)
  })

  it.each(['published', 'rejected'] as const)('%s 상태에서 publish → 409', async (status) => {
    mockResourceFindUnique.mockResolvedValue(makeResource(status))
    const { POST } = await import('../../app/api/resources/[id]/publish/route')
    const res = await POST(makeRequest(), makeCtx())
    expect(res.status).toBe(409)
  })

  it('support 는 publish 403', async () => {
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'support',
      totpVerified: true,
      totpSetup: true,
    }
    mockResourceFindUnique.mockResolvedValue(makeResource('draft'))
    const { POST } = await import('../../app/api/resources/[id]/publish/route')
    const res = await POST(makeRequest(), makeCtx())
    expect(res.status).toBe(403)
  })

  it('존재하지 않는 리소스 → 404', async () => {
    mockResourceFindUnique.mockResolvedValue(null)
    const { POST } = await import('../../app/api/resources/[id]/publish/route')
    const res = await POST(makeRequest(), makeCtx('non-existent'))
    expect(res.status).toBe(404)
  })
})

// ─── reject ──────────────────────────────────────────────────────────────────

describe('POST /api/resources/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    mockResourceUpdate.mockResolvedValue({ ...makeResource('rejected'), status: 'rejected' })
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it.each(['draft', 'review'] as const)('%s → rejected 성공', async (status) => {
    mockResourceFindUnique.mockResolvedValue(makeResource(status))
    const { POST } = await import('../../app/api/resources/[id]/reject/route')
    const res = await POST(makeRequest({ reason: '해상도 부족합니다.' }), makeCtx())
    expect(res.status).toBe(200)
  })

  it.each(['published', 'rejected'] as const)('%s 상태에서 reject → 409', async (status) => {
    mockResourceFindUnique.mockResolvedValue(makeResource(status))
    const { POST } = await import('../../app/api/resources/[id]/reject/route')
    const res = await POST(makeRequest({ reason: '해상도 부족합니다.' }), makeCtx())
    expect(res.status).toBe(409)
  })

  it('reason 없음 → 400', async () => {
    mockResourceFindUnique.mockResolvedValue(makeResource('draft'))
    const { POST } = await import('../../app/api/resources/[id]/reject/route')
    const res = await POST(makeRequest({}), makeCtx())
    expect(res.status).toBe(400)
  })

  it('reason 너무 짧음 → 400', async () => {
    mockResourceFindUnique.mockResolvedValue(makeResource('draft'))
    const { POST } = await import('../../app/api/resources/[id]/reject/route')
    const res = await POST(makeRequest({ reason: '짧음' }), makeCtx())
    expect(res.status).toBe(400)
  })
})
