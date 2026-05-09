/**
 * PATCH /api/resources/[id]/keypoints — 키포인트 보정 테스트
 *
 * 좌표 범위 검증 (0..1) / inferred 플래그 갱신 / 권한
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

function makeRequest(body: unknown) {
  return {
    method: 'PATCH',
    nextUrl: new URL('http://localhost:3001/api/resources/res-1/keypoints'),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeCtx(id = 'res-1') {
  return { params: Promise.resolve({ id }) }
}

const SAMPLE_RESOURCE = {
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
  meta: { keypoints: [{ name: 'head', x: 0.5, y: 0.1, inferred: true }] },
  tags: [],
  status: 'review',
  reviewer: null,
  reviewNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const VALID_KEYPOINTS = [
  { name: 'head', x: 0.5, y: 0.1 },
  { name: 'mouth', x: 0.5, y: 0.18 },
  { name: 'center', x: 0.5, y: 0.5 },
]

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('PATCH /api/resources/[id]/keypoints', () => {
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
    mockResourceFindUnique.mockResolvedValue(SAMPLE_RESOURCE)
    mockResourceUpdate.mockImplementation((args: { data: { meta: unknown } }) =>
      Promise.resolve({ ...SAMPLE_RESOURCE, meta: args.data.meta }),
    )
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('curator — 키포인트 보정 성공', async () => {
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(makeRequest({ keypoints: VALID_KEYPOINTS }), makeCtx())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { meta: { keypoints: { inferred: boolean }[] } }
    // inferred=false 로 변환
    expect(body.meta.keypoints.every((kp: { inferred: boolean }) => kp.inferred === false)).toBe(
      true,
    )
  })

  it.each(['support', 'readonly'] as const)('%s 은 403', async (role) => {
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(makeRequest({ keypoints: VALID_KEYPOINTS }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('x 좌표 범위 초과 → 400', async () => {
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(
      makeRequest({ keypoints: [{ name: 'head', x: 1.5, y: 0.1 }] }),
      makeCtx(),
    )
    expect(res.status).toBe(400)
  })

  it('y 좌표 음수 → 400', async () => {
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(
      makeRequest({ keypoints: [{ name: 'head', x: 0.5, y: -0.1 }] }),
      makeCtx(),
    )
    expect(res.status).toBe(400)
  })

  it('키포인트 이름 미허용 → 400', async () => {
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(
      makeRequest({ keypoints: [{ name: 'elbow', x: 0.5, y: 0.3 }] }),
      makeCtx(),
    )
    expect(res.status).toBe(400)
  })

  it('빈 배열 → 400', async () => {
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(makeRequest({ keypoints: [] }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('존재하지 않는 리소스 → 404', async () => {
    mockResourceFindUnique.mockResolvedValue(null)
    const { PATCH } = await import('../../app/api/resources/[id]/keypoints/route')
    const res = await PATCH(makeRequest({ keypoints: VALID_KEYPOINTS }), makeCtx('non-existent'))
    expect(res.status).toBe(404)
  })
})
