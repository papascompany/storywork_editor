/**
 * POST /api/resources/bulk — 일괄 액션 테스트
 *
 * publish / reject / delete / tag-add / tag-remove
 * 100개 batch / 부분 실패 / 권한 필터
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

function makeRequest(body: unknown) {
  return {
    method: 'POST',
    nextUrl: new URL('http://localhost:3001/api/resources/bulk'),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeSampleResource(id: string, status = 'review') {
  return {
    id,
    slug: `resource-${id}`,
    kind: 'pose',
    format: 'png',
    ownerType: 'system',
    ownerId: null,
    fileUrl: `https://example.com/${id}.png`,
    thumbUrl: null,
    variants: null,
    width: 750,
    height: 750,
    masterDpi: 90,
    lowDpi: true,
    meta: { keypoints: [] },
    tags: ['existing'],
    status,
    reviewer: null,
    reviewNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('POST /api/resources/bulk', () => {
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
    mockResourceFindUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(makeSampleResource(args.where.id)),
    )
    mockResourceUpdate.mockImplementation((args: { where: { id: string }; data: unknown }) =>
      Promise.resolve({ ...makeSampleResource(args.where.id), ...(args.data as object) }),
    )
    mockResourceDelete.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(makeSampleResource(args.where.id)),
    )
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('support/readonly 는 403', async () => {
    for (const role of ['support', 'readonly'] as const) {
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { POST } = await import('../../app/api/resources/bulk/route')
      const res = await POST(makeRequest({ ids: ['r1'], action: 'publish' }))
      expect(res.status).toBe(403)
    }
  })

  it('curator 는 delete 403', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1'], action: 'delete' }))
    expect(res.status).toBe(403)
  })

  it('ids 없음 → 400', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: [], action: 'publish' }))
    expect(res.status).toBe(400)
  })

  it('일괄 publish 성공', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1', 'r2', 'r3'], action: 'publish' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: string[]; failed: unknown[] }
    expect(body.ok).toHaveLength(3)
    expect(body.failed).toHaveLength(0)
  })

  it('일괄 reject — reason 없음 → 400', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1'], action: 'reject' }))
    expect(res.status).toBe(400)
  })

  it('일괄 reject 성공', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(
      makeRequest({ ids: ['r1'], action: 'reject', reason: '해상도 부족합니다.' }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: string[]; failed: unknown[] }
    expect(body.ok).toHaveLength(1)
  })

  it('일괄 태그 추가 성공', async () => {
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1', 'r2'], action: 'tag-add', tags: ['신태그'] }))
    expect(res.status).toBe(200)
  })

  it('superadmin 일괄 delete 성공', async () => {
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1', 'r2'], action: 'delete' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: string[]; failed: unknown[] }
    expect(body.ok).toHaveLength(2)
  })

  it('존재하지 않는 리소스 → 부분 실패', async () => {
    mockResourceFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === 'bad-id') return Promise.resolve(null)
      return Promise.resolve(makeSampleResource(args.where.id))
    })
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1', 'bad-id'], action: 'publish' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: string[]; failed: { id: string; reason: string }[] }
    expect(body.ok).toHaveLength(1)
    expect(body.failed).toHaveLength(1)
    expect(body.failed[0]?.id).toBe('bad-id')
  })

  it('이미 published 상태에서 publish → 부분 실패', async () => {
    mockResourceFindUnique.mockResolvedValue(makeSampleResource('r1', 'published'))
    const { POST } = await import('../../app/api/resources/bulk/route')
    const res = await POST(makeRequest({ ids: ['r1'], action: 'publish' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: string[]; failed: unknown[] }
    expect(body.failed).toHaveLength(1)
  })
})
