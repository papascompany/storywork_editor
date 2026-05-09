/**
 * GET /api/resources — 목록 조회 테스트
 *
 * 페이지네이션 / 필터 / 검색 / facets / 권한 매트릭스
 */
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockResourceFindMany = vi.fn()
const mockResourceCount = vi.fn()
const mockResourceGroupBy = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    resource: {
      findMany: mockResourceFindMany,
      count: mockResourceCount,
      groupBy: mockResourceGroupBy,
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

function makeRequest(searchParams?: Record<string, string | string[]>) {
  const url = new URL('http://localhost:3001/api/resources')
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, val))
      else url.searchParams.set(k, v)
    }
  }
  return { method: 'GET', nextUrl: url } as unknown as NextRequest
}

const SAMPLE_RESOURCE = {
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
  tags: ['걷기', '여자'],
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('GET /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResourceFindMany.mockResolvedValue([SAMPLE_RESOURCE])
    mockResourceCount.mockResolvedValue(1)
    mockResourceGroupBy.mockResolvedValue([])
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/resources/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/resources/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 GET 에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/resources/route')
      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[]; totalCount: number; facets: unknown }
      expect(body.data).toHaveLength(1)
      expect(body.facets).toBeDefined()
    },
  )

  it('페이지네이션 파라미터 전달', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/resources/route')
    await GET(makeRequest({ page: '2', pageSize: '10' }))
    expect(mockResourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    )
  })

  it('kind 필터 전달', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/resources/route')
    await GET(makeRequest({ kind: ['pose', 'background'] }))
    expect(mockResourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: { in: expect.any(Array) } }),
      }),
    )
  })

  it('lowDpi=true 필터 전달', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/resources/route')
    await GET(makeRequest({ lowDpi: 'true' }))
    expect(mockResourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ lowDpi: true }) }),
    )
  })

  it('검색어 OR 조건 적용', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    const { GET } = await import('../../app/api/resources/route')
    await GET(makeRequest({ search: '걷기' }))
    expect(mockResourceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    )
  })
})
