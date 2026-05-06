/**
 * M2-04 — /api/search/poses Route Handler 단위 테스트
 *
 * Mock: Prisma, embed-server (임베딩 서버 모듈)
 * 검증: filter/query 분기, lowDpi 필터, pagination, took_ms 필드
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─────────────────────────────────────────────
// 모킹 (hoisted — vi.mock 은 파일 최상단에서 hoisting 됨)
// ─────────────────────────────────────────────

vi.mock('../app/api/_lib/prisma', () => ({
  getPrismaClient: vi.fn(),
}))

vi.mock('../app/api/_lib/embed-server', () => ({
  embedSearchQuery: vi.fn().mockResolvedValue('[0.1,0.2,0.3]'),
}))

vi.mock('../app/api/_lib/search-query', () => ({
  buildSearchQuery: vi.fn(),
}))

// ─────────────────────────────────────────────
// 타입 + import (mock 이후)
// ─────────────────────────────────────────────

import { embedSearchQuery } from '../app/api/_lib/embed-server'
import { buildSearchQuery } from '../app/api/_lib/search-query'
import type { ResourceSummary } from '../app/api/_lib/search-types'
import type { SearchPosesResponse } from '../app/api/_lib/search-types'

// 빌더 mock 참조

const mockBuildSearchQuery = vi.mocked(buildSearchQuery)
const mockEmbedSearchQuery = vi.mocked(embedSearchQuery)

// ─────────────────────────────────────────────
// 테스트 픽스처
// ─────────────────────────────────────────────

const sampleResource: ResourceSummary = {
  id: 'cltest001',
  slug: 'standing-female-front-01',
  thumbUrl: 'https://cdn.example.com/poses/standing-female-front-01/thumb.png',
  width: 750,
  height: 750,
  masterDpi: 74,
  lowDpi: true,
  meta: { action: 'standing', view: 'front', bodyType: 'F' },
  tags: ['standing', 'female', 'front', 'lowDpi'],
  score: 0.87,
}

// ─────────────────────────────────────────────
// Route Handler 직접 임포트 및 테스트
// ─────────────────────────────────────────────

async function callRoute(body: unknown): Promise<{ status: number; data: unknown }> {
  const { POST } = await import('../app/api/search/poses/route')

  const req = new Request('http://localhost:3000/api/search/poses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const res = await POST(req as Parameters<typeof POST>[0])
  const data = (await res.json()) as unknown
  return { status: res.status, data }
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('POST /api/search/poses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildSearchQuery.mockResolvedValue({
      results: [sampleResource],
      total: 1,
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ── 1. 기본 query 검색 ────────────────────

  it('query 있으면 embedSearchQuery 호출', async () => {
    const { status } = await callRoute({ query: '서있는 여자', limit: 10 })
    expect(status).toBe(200)
    expect(mockEmbedSearchQuery).toHaveBeenCalledWith('서있는 여자')
  })

  it('query 없으면 embedSearchQuery 호출 안 함', async () => {
    await callRoute({ limit: 10 })
    expect(mockEmbedSearchQuery).not.toHaveBeenCalled()
  })

  it('results + total + took_ms 응답', async () => {
    const { data } = await callRoute({ query: '서있는' })
    const resp = data as SearchPosesResponse
    expect(resp.results).toHaveLength(1)
    expect(resp.total).toBe(1)
    expect(typeof resp.took_ms).toBe('number')
    expect(resp.took_ms).toBeGreaterThanOrEqual(0)
  })

  it('결과의 slug, thumbUrl, meta 필드 포함', async () => {
    const { data } = await callRoute({ query: '서있는' })
    const resp = data as SearchPosesResponse
    const first = resp.results[0]
    expect(first?.slug).toBe('standing-female-front-01')
    expect(first?.meta.action).toBe('standing')
    expect(first?.meta.view).toBe('front')
  })

  // ── 2. 필터 분기 ──────────────────────────

  it('filters.bodyType 전달 시 buildSearchQuery에 filters 포함', async () => {
    await callRoute({ filters: { bodyType: ['F', 'M'] } })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call).toBeDefined()
    expect(call?.[1]).toMatchObject({
      filters: { bodyType: ['F', 'M'] },
    })
  })

  it('filters.view 전달', async () => {
    await callRoute({ filters: { view: ['front', 'side'] } })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({
      filters: { view: ['front', 'side'] },
    })
  })

  it('filters.action 전달', async () => {
    await callRoute({ filters: { action: ['standing', 'sitting'] } })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({
      filters: { action: ['standing', 'sitting'] },
    })
  })

  // ── 3. lowDpi 필터 (ADR-0011a) ──────────

  it('filters.lowDpi=false 전달 시 buildSearchQuery에 lowDpi:false 포함', async () => {
    await callRoute({ filters: { lowDpi: false } })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({
      filters: { lowDpi: false },
    })
  })

  it('filters.lowDpi=true (포함) 전달', async () => {
    await callRoute({ filters: { lowDpi: true } })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({
      filters: { lowDpi: true },
    })
  })

  it('filters 없으면 lowDpi 필터 없음', async () => {
    await callRoute({})
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]?.filters?.lowDpi).toBeUndefined()
  })

  // ── 4. 페이지네이션 ──────────────────────

  it('limit + offset buildSearchQuery에 전달', async () => {
    await callRoute({ limit: 20, offset: 40 })
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({ limit: 20, offset: 40 })
  })

  it('기본 limit=30, offset=0', async () => {
    await callRoute({})
    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]).toMatchObject({ limit: 30, offset: 0 })
  })

  it('limit 최대 100 초과 시 400', async () => {
    const { status } = await callRoute({ limit: 101 })
    expect(status).toBe(400)
  })

  it('limit 최소 1 미만 시 400', async () => {
    const { status } = await callRoute({ limit: 0 })
    expect(status).toBe(400)
  })

  // ── 5. 잘못된 요청 ───────────────────────

  it('body 없으면 200 (default 값으로 처리)', async () => {
    const { status } = await callRoute({})
    expect(status).toBe(200)
  })

  it('query 200자 초과 시 400', async () => {
    const { status } = await callRoute({ query: 'a'.repeat(201) })
    expect(status).toBe(400)
  })

  // ── 6. 빈 결과 ───────────────────────────

  it('결과 없으면 빈 배열 + total=0', async () => {
    mockBuildSearchQuery.mockResolvedValueOnce({ results: [], total: 0 })
    const { data } = await callRoute({ query: '없는포즈xyz' })
    const resp = data as SearchPosesResponse
    expect(resp.results).toHaveLength(0)
    expect(resp.total).toBe(0)
  })

  // ── 7. GET 차단 ──────────────────────────

  it('GET 요청 → 405', async () => {
    const { GET } = await import('../app/api/search/poses/route')
    const res = GET()
    expect(res.status).toBe(405)
  })
})

// ─────────────────────────────────────────────
// lowDpi 필터 동작 검증 (buildSearchQuery 단독)
// ─────────────────────────────────────────────

describe('lowDpi 필터 통합 (buildSearchQuery mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuildSearchQuery.mockResolvedValue({ results: [], total: 0 })
  })

  it('lowDpi=false 필터 전달 → buildSearchQuery 의 filters.lowDpi=false', async () => {
    await callRoute({ filters: { lowDpi: false }, limit: 10 })

    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call).toBeDefined()
    expect(call?.[1]?.filters?.lowDpi).toBe(false)
  })

  it('lowDpi 필터 없으면 undefined → buildSearchQuery 가 제한 없음', async () => {
    await callRoute({ limit: 10 })

    const call = mockBuildSearchQuery.mock.calls[0]
    expect(call?.[1]?.filters?.lowDpi).toBeUndefined()
  })
})
