/**
 * POST /api/script/analyze Route Handler 단위 테스트 (CONTI-03)
 *
 * 핵심 검증: projectId 미지정 = 무영속(stateless) 콘티 미리보기 모드
 *   - DB 조회/저장을 일절 하지 않고 AnalyzeResult 만 반환
 *   - 인증은 여전히 필수
 *   - projectId 지정 시 기존 동작(소유권 검증 + SceneDoc 영속화) 유지
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── 모킹 (호이스팅) ──────────────────────────────────────────────────────────

vi.mock('../../app/api/_lib/prisma', () => ({
  getPrismaClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createWebServerClient: vi.fn(),
}))

vi.mock('@storywork/ai-script', () => ({
  analyze: vi.fn(),
}))

/* eslint-disable import/order */
import { getPrismaClient } from '../../app/api/_lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { analyze } from '@storywork/ai-script'
import type { AnalyzeResult } from '@storywork/ai-script'
/* eslint-enable import/order */

const mockGetPrismaClient = vi.mocked(getPrismaClient)
const mockCreateWebServerClient = vi.mocked(createWebServerClient)
const mockAnalyze = vi.mocked(analyze)

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const MOCK_USER_EMAIL = 'test@example.com'
const MOCK_DB_USER = { id: 'user-cuid-001', email: MOCK_USER_EMAIL, role: 'user' }

const MOCK_ANALYZE_RESULT: AnalyzeResult = {
  format: 'screenplay',
  scenes: [
    {
      index: 0,
      slug: 'scene-01',
      summary: '장면 1',
      meta: { emotion: 'neutral' },
      lines: [{ index: 0, speaker: '철수', text: '안녕' }],
      characters: ['철수'],
      confidence: 0.9,
    },
  ],
  characters: [{ name: '철수', mentionCount: 1 }],
  seed: 0,
  modelVersion: 'rule-only',
}

function makeMockPrisma(overrides: { project?: unknown } = {}) {
  return {
    user: { findUnique: vi.fn().mockResolvedValue(MOCK_DB_USER) },
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.project !== undefined
            ? overrides.project
            : { id: 'proj-001', ownerId: MOCK_DB_USER.id },
        ),
    },
    $transaction: vi.fn().mockResolvedValue(undefined),
  }
}

function makeMockSupabase(authenticated = true) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: authenticated ? { id: 'supabase-uuid-001', email: MOCK_USER_EMAIL } : null,
        },
        error: authenticated ? null : new Error('not authenticated'),
      }),
    },
  }
}

async function callRoute(body: unknown): Promise<{ status: number; data: unknown }> {
  const { POST } = await import('../../app/api/script/analyze/route')
  const req = new Request('http://localhost:3000/api/script/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const res = await POST(req as Parameters<typeof POST>[0])
  const data = (await res.json()) as unknown
  return { status: res.status, data }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('POST /api/script/analyze', () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = makeMockPrisma()
    mockCreateWebServerClient.mockResolvedValue(makeMockSupabase() as any)
    mockGetPrismaClient.mockReturnValue(mockPrisma as any)
    mockAnalyze.mockResolvedValue(MOCK_ANALYZE_RESULT)
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('무영속 모드(projectId 없음): 200 + 분석 결과, DB 저장/소유권 조회 없음', async () => {
    const { status, data } = await callRoute({ scriptRaw: '철수: 안녕!', seed: 0 })

    expect(status).toBe(200)
    expect((data as AnalyzeResult).scenes).toHaveLength(1)
    // 무영속: 프로젝트 조회도, 트랜잭션(영속화)도 없어야 한다
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('무영속 모드에서도 인증은 필수 → 401', async () => {
    mockCreateWebServerClient.mockResolvedValue(makeMockSupabase(false) as any)

    const { status } = await callRoute({ scriptRaw: '철수: 안녕!' })
    expect(status).toBe(401)
  })

  it('projectId 지정: 소유권 검증 + 영속화(트랜잭션) 수행', async () => {
    const { status } = await callRoute({ projectId: 'proj-001', scriptRaw: '철수: 안녕!' })

    expect(status).toBe(200)
    expect(mockPrisma.project.findUnique).toHaveBeenCalled()
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('projectId 지정 + 타인 프로젝트 → 403', async () => {
    mockPrisma = makeMockPrisma({ project: { id: 'proj-001', ownerId: 'other-user' } })
    mockGetPrismaClient.mockReturnValue(mockPrisma as any)

    const { status } = await callRoute({ projectId: 'proj-001', scriptRaw: '철수: 안녕!' })
    expect(status).toBe(403)
  })

  it('seed 전달: analyze 옵션에 그대로 반영', async () => {
    await callRoute({ scriptRaw: '철수: 안녕!', seed: 42 })
    expect(mockAnalyze).toHaveBeenCalledWith('철수: 안녕!', expect.objectContaining({ seed: 42 }))
  })

  it('LLM 하드 게이트: env 미설정이면 body llmEnabled:true 여도 rule-only 강제', async () => {
    delete process.env['STORYWORK_LLM']
    const { status } = await callRoute({ scriptRaw: '철수: 안녕!', llmEnabled: true })
    expect(status).toBe(200)
    expect(mockAnalyze).toHaveBeenCalledWith(
      '철수: 안녕!',
      expect.objectContaining({ llmEnabled: false }),
    )
  })

  it('공백/개행만 있는 대본 → 400', async () => {
    const { status } = await callRoute({ scriptRaw: '  \n\n  ' })
    expect(status).toBe(400)
  })

  it('rate limit: 분당 10회 초과 → 429 + Retry-After', async () => {
    for (let i = 0; i < 10; i++) {
      const { status } = await callRoute({ scriptRaw: '철수: 안녕!' })
      expect(status).toBe(200)
    }
    const { status } = await callRoute({ scriptRaw: '철수: 안녕!' })
    expect(status).toBe(429)
  })
})
