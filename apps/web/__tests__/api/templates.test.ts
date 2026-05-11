/**
 * GET /api/templates Route Handler 단위 테스트
 *
 * Mock: getPrismaClient (DB 없이 순수 로직 검증)
 * 검증:
 *   - status=published → 전체 목록 반환
 *   - status=draft 등 → 빈 배열
 *   - 페이지네이션 (page / pageSize)
 *   - 검색 (search)
 *   - fabricJson 에서 intent 추출
 *   - DB 오류 → 500
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── 모킹 ────────────────────────────────────────────────────────────────────

vi.mock('../../app/api/_lib/prisma', () => ({
  getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../app/api/_lib/prisma'

const mockGetPrismaClient = vi.mocked(getPrismaClient)

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-10T00:00:00.000Z')

const sampleFormat = {
  widthMm: 130,
  heightMm: 200,
  bleedMm: 3,
  safeMm: 5,
}

function makeTemplateRow(
  overrides: Partial<{
    id: string
    name: string
    formatId: string
    format: typeof sampleFormat
    slots: unknown
    thumbnail: string | null
    fabricJson: unknown
    createdAt: Date
    updatedAt: Date
  }> = {},
) {
  return {
    id: 'tpl_001',
    name: '기본 레이아웃',
    formatId: 'fmt_001',
    format: sampleFormat,
    slots: [
      {
        id: 's1',
        kind: 'pose',
        x: 0.1,
        y: 0.1,
        w: 0.4,
        h: 0.6,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
    ],
    thumbnail: null,
    fabricJson: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

// ─── callRoute 헬퍼 ──────────────────────────────────────────────────────────

async function callRoute(
  params: Record<string, string> = {},
): Promise<{ status: number; data: unknown }> {
  const { GET } = await import('../../app/api/templates/route')

  const url = new URL('http://localhost:3000/api/templates')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const req = new Request(url.toString(), { method: 'GET' })
  const res = await GET(req as Parameters<typeof GET>[0])
  const data = (await res.json()) as unknown
  return { status: res.status, data }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('GET /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ── 1. status=published 필터 ──────────────────────────────────────────────

  it('status=published → 템플릿 목록 반환', async () => {
    const row = makeTemplateRow()
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { status, data } = await callRoute({ status: 'published' })
    expect(status).toBe(200)

    const resp = data as { templates: unknown[]; totalCount: number }
    expect(resp.templates).toHaveLength(1)
    expect(resp.totalCount).toBe(1)
  })

  it('status 파라미터 없음 → 전체 목록 반환 (published 와 동일)', async () => {
    const row = makeTemplateRow()
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { status, data } = await callRoute({})
    expect(status).toBe(200)

    const resp = data as { templates: unknown[]; totalCount: number }
    expect(resp.templates).toHaveLength(1)
  })

  it('status=draft → 빈 배열 (DB 호출 없음)', async () => {
    const { status, data } = await callRoute({ status: 'draft' })
    expect(status).toBe(200)

    const resp = data as { templates: unknown[]; totalCount: number }
    expect(resp.templates).toHaveLength(0)
    expect(resp.totalCount).toBe(0)
    expect(mockGetPrismaClient).not.toHaveBeenCalled()
  })

  it('status=review → 빈 배열', async () => {
    const { status, data } = await callRoute({ status: 'review' })
    expect(status).toBe(200)

    const resp = data as { templates: unknown[]; totalCount: number }
    expect(resp.templates).toHaveLength(0)
    expect(mockGetPrismaClient).not.toHaveBeenCalled()
  })

  // ── 2. 응답 형식 검증 ────────────────────────────────────────────────────

  it('응답 필드: id / name / formatId / format / slots / thumbnail / intent', async () => {
    const row = makeTemplateRow({
      thumbnail: 'https://cdn.example.com/t/thumb.png',
      fabricJson: { intent: '액션씬' },
    })
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { data } = await callRoute({ status: 'published' })
    const resp = data as { templates: Array<Record<string, unknown>>; totalCount: number }
    const tpl = resp.templates[0]

    expect(tpl).toBeDefined()
    expect(tpl?.['id']).toBe('tpl_001')
    expect(tpl?.['name']).toBe('기본 레이아웃')
    expect(tpl?.['formatId']).toBe('fmt_001')
    expect(tpl?.['format']).toMatchObject({ widthMm: 130, heightMm: 200, bleedMm: 3, safeMm: 5 })
    expect(Array.isArray(tpl?.['slots'])).toBe(true)
    expect(tpl?.['thumbnail']).toBe('https://cdn.example.com/t/thumb.png')
    expect(tpl?.['intent']).toBe('액션씬')
  })

  it('thumbnail null 이면 null 반환', async () => {
    const row = makeTemplateRow({ thumbnail: null })
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { data } = await callRoute({ status: 'published' })
    const resp = data as { templates: Array<Record<string, unknown>> }
    expect(resp.templates[0]?.['thumbnail']).toBeNull()
  })

  it('fabricJson 에 intent 없으면 intent=null', async () => {
    const row = makeTemplateRow({ fabricJson: {} })
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { data } = await callRoute({ status: 'published' })
    const resp = data as { templates: Array<Record<string, unknown>> }
    expect(resp.templates[0]?.['intent']).toBeNull()
  })

  it('createdAt / updatedAt 은 ISO string', async () => {
    const row = makeTemplateRow()
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValue(1),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { data } = await callRoute({ status: 'published' })
    const resp = data as { templates: Array<Record<string, unknown>> }
    const tpl = resp.templates[0]
    expect(typeof tpl?.['createdAt']).toBe('string')
    expect(typeof tpl?.['updatedAt']).toBe('string')
    expect(tpl?.['createdAt']).toBe(NOW.toISOString())
  })

  // ── 3. 페이지네이션 ──────────────────────────────────────────────────────

  it('page + pageSize 가 findMany skip/take 에 전달됨', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published', page: '2', pageSize: '5' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 5 }))
  })

  it('기본값: page=0, pageSize=20', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }))
  })

  it('pageSize 최대 100 클램프', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published', pageSize: '9999' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }))
  })

  it('pageSize 최소 1 클램프', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published', pageSize: '0' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }))
  })

  it('totalCount 반환', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(42)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { data } = await callRoute({ status: 'published' })
    const resp = data as { totalCount: number }
    expect(resp.totalCount).toBe(42)
  })

  // ── 4. 검색 ──────────────────────────────────────────────────────────────

  it('search 파라미터 → findMany where.name.contains', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published', search: '액션' })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: '액션', mode: 'insensitive' } },
      }),
    )
  })

  it('search 없으면 where 빈 객체', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    mockGetPrismaClient.mockReturnValue({
      template: { findMany, count },
    } as unknown as ReturnType<typeof getPrismaClient>)

    await callRoute({ status: 'published' })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })

  // ── 5. 빈 결과 ───────────────────────────────────────────────────────────

  it('DB 결과 없으면 templates=[] + totalCount=0', async () => {
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { status, data } = await callRoute({ status: 'published' })
    expect(status).toBe(200)

    const resp = data as { templates: unknown[]; totalCount: number }
    expect(resp.templates).toHaveLength(0)
    expect(resp.totalCount).toBe(0)
  })

  // ── 6. DB 오류 → 500 ─────────────────────────────────────────────────────

  it('DB 오류 시 500 반환', async () => {
    mockGetPrismaClient.mockReturnValue({
      template: {
        findMany: vi.fn().mockRejectedValue(new Error('connection timeout')),
        count: vi.fn().mockRejectedValue(new Error('connection timeout')),
      },
    } as unknown as ReturnType<typeof getPrismaClient>)

    const { status, data } = await callRoute({ status: 'published' })
    expect(status).toBe(500)

    const resp = data as { error: string }
    expect(typeof resp.error).toBe('string')
  })
})
