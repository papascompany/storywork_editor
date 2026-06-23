/**
 * /api/admin/demo-mode — 데모 모드 토글 (옵션B)
 * 인증/권한(curator+) + upsert + audit 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFlagFindUnique = vi.fn()
const mockFlagUpsert = vi.fn()

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    featureFlag: { findUnique: mockFlagFindUnique, upsert: mockFlagUpsert },
  },
}))

const mockRecordAudit = vi.fn()
vi.mock('../../src/lib/audit', () => ({ recordAudit: mockRecordAudit }))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: vi.fn() }),
}))

let mockSession: { user: { id: string } } | null = null
let mockAdminUser: { id: string; email: string; role: string } | null = null

vi.mock('../../src/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual, // hasRole 은 실제 사용
    getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
    getAdminUser: vi.fn().mockImplementation(() => Promise.resolve(mockAdminUser)),
  }
})

function patchReq(body: unknown) {
  return new Request('http://localhost:3001/api/admin/demo-mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

async function callPatch(body: unknown) {
  const { PATCH } = await import('../../app/api/admin/demo-mode/route')
  return PATCH(patchReq(body))
}
async function callGet() {
  const { GET } = await import('../../app/api/admin/demo-mode/route')
  return GET()
}

describe('/api/admin/demo-mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { user: { id: 'au' } }
    mockAdminUser = { id: 'admin1', email: 'a@b.com', role: 'curator' }
    mockFlagFindUnique.mockResolvedValue({ key: 'demoMode', enabled: false, updatedAt: new Date() })
    mockFlagUpsert.mockImplementation(
      ({ create, update }: { create?: { enabled: boolean }; update?: { enabled: boolean } }) =>
        Promise.resolve({
          key: 'demoMode',
          enabled: (update ?? create)?.enabled ?? false,
          updatedAt: new Date(),
        }),
    )
    mockRecordAudit.mockResolvedValue(undefined)
  })

  it('미인증 → 401', async () => {
    mockSession = null
    expect((await callPatch({ enabled: true })).status).toBe(401)
    expect(mockFlagUpsert).not.toHaveBeenCalled()
  })

  it('관리자 아님 → 403', async () => {
    mockAdminUser = null
    expect((await callPatch({ enabled: true })).status).toBe(403)
  })

  it('curator 미만(readonly) → 403', async () => {
    mockAdminUser = { id: 'r1', email: 'r@b.com', role: 'readonly' }
    expect((await callPatch({ enabled: true })).status).toBe(403)
    expect(mockFlagUpsert).not.toHaveBeenCalled()
  })

  it('enabled 누락/비boolean → 400', async () => {
    expect((await callPatch({})).status).toBe(400)
    expect((await callPatch({ enabled: 'yes' })).status).toBe(400)
  })

  it('curator 가 ON 토글 → 200 + upsert(enabled:true) + audit', async () => {
    const res = await callPatch({ enabled: true })
    expect(res.status).toBe(200)
    const arg = mockFlagUpsert.mock.calls[0]?.[0] as {
      where: { key: string }
      update: { enabled: boolean; updatedById: string }
    }
    expect(arg.where.key).toBe('demoMode')
    expect(arg.update.enabled).toBe(true)
    expect(arg.update.updatedById).toBe('admin1')
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const audit = mockRecordAudit.mock.calls[0]?.[0] as { entityType: string; action: string }
    expect(audit.entityType).toBe('FeatureFlag')
    expect(audit.action).toBe('update')
  })

  it('GET → 현재 상태 반환', async () => {
    mockFlagFindUnique.mockResolvedValueOnce({
      key: 'demoMode',
      enabled: true,
      updatedAt: new Date(),
    })
    const res = await callGet()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { enabled: boolean }
    expect(body.enabled).toBe(true)
  })
})
