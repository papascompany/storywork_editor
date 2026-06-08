/**
 * /api/template-sets Route Handler 단위 테스트
 *
 * CRUD + 권한 매트릭스 + templateIds 검증 + coverIdx 검증
 */
import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

const mockTemplateSetCreate = vi.fn()
const mockTemplateSetFindMany = vi.fn()
const mockTemplateSetFindUnique = vi.fn()
const mockTemplateSetCount = vi.fn()
const mockTemplateSetUpdate = vi.fn()
const mockTemplateSetDelete = vi.fn()
const mockTemplateFindMany = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    templateSet: {
      create: mockTemplateSetCreate,
      findMany: mockTemplateSetFindMany,
      findUnique: mockTemplateSetFindUnique,
      count: mockTemplateSetCount,
      update: mockTemplateSetUpdate,
      delete: mockTemplateSetDelete,
    },
    template: {
      findMany: mockTemplateFindMany,
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
  const url = new URL('http://localhost:3001/api/template-sets')
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

const SAMPLE_TEMPLATE = {
  id: 'tmpl-1',
  name: '기본 2컷',
  thumbnail: null,
  slots: [],
}

const SAMPLE_SET = {
  id: 'set-1',
  name: '기본 세트',
  coverIdx: 0,
  templates: [SAMPLE_TEMPLATE],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const VALID_BODY = {
  name: '기본 세트',
  templateIds: ['tmpl-1'],
  coverIdx: 0,
}

// ─── GET /api/template-sets ───────────────────────────────────────────────────

describe('GET /api/template-sets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateSetFindMany.mockResolvedValue([{ ...SAMPLE_SET, templateCount: 1 }])
    mockTemplateSetCount.mockResolvedValue(1)
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { GET } = await import('../../app/api/template-sets/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('admin 아니면 403', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = null
    const { GET } = await import('../../app/api/template-sets/route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 GET 에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/template-sets/route')
      const res = await GET(makeRequest('GET'))
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[]; totalCount: number }
      expect(body.data).toHaveLength(1)
    },
  )

  it('search 파라미터 전달 가능', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateSetFindMany.mockResolvedValue([])
    mockTemplateSetCount.mockResolvedValue(0)
    const { GET } = await import('../../app/api/template-sets/route')
    const res = await GET(makeRequest('GET', undefined, { search: '검색어' }))
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/template-sets ──────────────────────────────────────────────────

describe('POST /api/template-sets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindMany.mockResolvedValue([{ id: 'tmpl-1' }])
    mockTemplateSetCreate.mockResolvedValue(SAMPLE_SET)
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  it('인증 없으면 401', async () => {
    mockSession = null
    const { POST } = await import('../../app/api/template-sets/route')
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
    const { POST } = await import('../../app/api/template-sets/route')
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
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 POST 에 성공한다 (201)', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(makeRequest('POST', VALID_BODY))
    expect(res.status).toBe(201)
  })

  it('Zod 검증 실패 → 400 (name 너무 짧음)', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(makeRequest('POST', { name: 'x', templateIds: ['tmpl-1'], coverIdx: 0 }))
    expect(res.status).toBe(400)
  })

  it('Zod 검증 실패 → 400 (templateIds 비어있음)', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(
      makeRequest('POST', { name: '유효한 이름', templateIds: [], coverIdx: 0 }),
    )
    expect(res.status).toBe(400)
  })

  it('coverIdx >= templateIds.length → 400', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(
      makeRequest('POST', { name: '유효한 이름', templateIds: ['tmpl-1'], coverIdx: 5 }),
    )
    expect(res.status).toBe(400)
  })

  it('존재하지 않는 templateId → 400', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateFindMany.mockResolvedValue([]) // 아무것도 없음
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(
      makeRequest('POST', { name: '유효한 이름', templateIds: ['non-existent-tmpl'], coverIdx: 0 }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: { details?: { missingIds?: string[] } } }
    expect(body.error?.details?.missingIds).toContain('non-existent-tmpl')
  })

  it('일부 templateId 누락 → 400, missingIds 포함', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateFindMany.mockResolvedValue([{ id: 'tmpl-1' }]) // tmpl-2 누락
    const { POST } = await import('../../app/api/template-sets/route')
    const res = await POST(
      makeRequest('POST', {
        name: '유효한 이름',
        templateIds: ['tmpl-1', 'tmpl-2'],
        coverIdx: 0,
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: { details?: { missingIds?: string[] } } }
    expect(body.error?.details?.missingIds).toContain('tmpl-2')
  })
})

// ─── GET /api/template-sets/[id] ─────────────────────────────────────────────

describe('GET /api/template-sets/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateSetFindUnique.mockResolvedValue(SAMPLE_SET)
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
    mockTemplateSetFindUnique.mockResolvedValue(null)
    const { GET } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('GET', 'non-existent')
    const res = await GET(req, { params })
    expect(res.status).toBe(404)
  })

  it.each(['superadmin', 'curator', 'support', 'readonly'] as const)(
    '%s 은 단건 조회에 성공한다',
    async (role) => {
      mockSession = { user: { id: 'u1' } }
      mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
      const { GET } = await import('../../app/api/template-sets/[id]/route')
      const { req, params } = makeRequestWithId('GET', 'set-1')
      const res = await GET(req, { params })
      expect(res.status).toBe(200)
    },
  )
})

// ─── PATCH /api/template-sets/[id] ───────────────────────────────────────────

describe('PATCH /api/template-sets/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateSetFindUnique.mockResolvedValue({
      ...SAMPLE_SET,
      templates: [{ id: 'tmpl-1' }],
    })
    mockTemplateSetUpdate.mockResolvedValue({ ...SAMPLE_SET, name: '변경됨' })
    mockTemplateFindMany.mockResolvedValue([{ id: 'tmpl-1' }])
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
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', { name: '변경됨이름' })
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
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', { name: '변경됨이름' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
  })

  it.each(['superadmin', 'curator'] as const)('%s 은 PATCH 에 성공한다', async (role) => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = { id: 'u1', email: 'a@b.com', role, totpVerified: true, totpSetup: true }
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', { name: '변경됨이름' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
  })

  it('표지 오버라이드(coverEnabled/coverWidthMm/isActive)가 prisma.update 로 전달된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', {
      coverEnabled: false, // 미사용 오버라이드
      coverWidthMm: 408,
      coverHeightMm: '', // 빈 값 → null(상속)
      isActive: false,
    })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    const arg = mockTemplateSetUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    expect(arg.data.coverEnabled).toBe(false)
    expect(arg.data.coverWidthMm).toBe(408)
    expect(arg.data.coverHeightMm).toBeNull()
    expect(arg.data.isActive).toBe(false)
  })

  it('coverEnabled=null(상속) 오버라이드도 update 로 전달된다', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'curator',
      totpVerified: true,
      totpSetup: true,
    }
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', { coverEnabled: null })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    const arg = mockTemplateSetUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    expect(arg.data.coverEnabled).toBeNull()
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
    mockTemplateSetFindUnique.mockResolvedValue(null)
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'non-existent', { name: '변경됨이름' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(404)
  })

  it('templateIds 에 존재하지 않는 ID 포함 → 400', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateFindMany.mockResolvedValue([]) // 아무것도 없음
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', {
      templateIds: ['non-existent'],
    })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
  })

  it('coverIdx >= templateIds.length → 400', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    mockTemplateFindMany.mockResolvedValue([{ id: 'tmpl-1' }])
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', {
      templateIds: ['tmpl-1'],
      coverIdx: 5, // 범위 초과
    })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
  })

  it('coverIdx 만 변경 시 현재 templates 길이 기준으로 검증', async () => {
    mockSession = { user: { id: 'u1' } }
    mockAdminUser = {
      id: 'u1',
      email: 'a@b.com',
      role: 'superadmin',
      totpVerified: true,
      totpSetup: true,
    }
    // SAMPLE_SET 에 template 1개뿐인데 coverIdx=5 → 400
    const { PATCH } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('PATCH', 'set-1', { coverIdx: 5 })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/template-sets/[id] ──────────────────────────────────────────

describe('DELETE /api/template-sets/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateSetFindUnique.mockResolvedValue({ id: 'set-1', name: '기본 세트' })
    mockTemplateSetDelete.mockResolvedValue(SAMPLE_SET)
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
    const { DELETE } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'set-1')
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
    const { DELETE } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'set-1')
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
    const { DELETE } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'set-1')
    const res = await DELETE(req, { params })
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
    mockTemplateSetFindUnique.mockResolvedValue(null)
    const { DELETE } = await import('../../app/api/template-sets/[id]/route')
    const { req, params } = makeRequestWithId('DELETE', 'non-existent')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })
})
