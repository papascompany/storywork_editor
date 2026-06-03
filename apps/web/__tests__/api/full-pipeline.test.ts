/**
 * POST /api/script/full-pipeline Route Handler 단위 테스트 (M4-04 Step 1)
 *
 * Mock: Prisma, Supabase, ai-script, ai-recommend, ai-layout
 * 검증:
 *   - 정상 파이프라인: analyze → recommend → compose → DB 저장 → 응답
 *   - 미인증 → 401
 *   - 잘못된 요청 → 400
 *   - projectId 또는 title 중 하나 필수
 *   - Format 없음 → 404
 *   - DB 저장 트랜잭션 실패 → 500
 *   - 결정론: 같은 seed → 같은 pages.length
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

vi.mock('@storywork/ai-recommend', () => ({
  recommend: vi.fn(),
}))

vi.mock('@storywork/ai-layout', () => ({
  compose: vi.fn(),
}))

vi.mock('@/lib/format-mapping', () => ({
  resolveFormatId: vi.fn((id: string) => id),
}))

// ─── Import (vi.mock 호이스팅 이후 — import/order 룰 적용 안 됨) ─────────────
/* eslint-disable import/order */
import { getPrismaClient } from '../../app/api/_lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { analyze } from '@storywork/ai-script'
import type { AnalyzeResult } from '@storywork/ai-script'
import { recommend } from '@storywork/ai-recommend'
import type { RecommendResult } from '@storywork/ai-recommend'
import { compose } from '@storywork/ai-layout'
import type { ComposeResult, PageFabricJson } from '@storywork/ai-layout'
/* eslint-enable import/order */

const mockGetPrismaClient = vi.mocked(getPrismaClient)
const mockCreateWebServerClient = vi.mocked(createWebServerClient)
const mockAnalyze = vi.mocked(analyze)
const mockRecommend = vi.mocked(recommend)
const mockCompose = vi.mocked(compose)

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const MOCK_USER_EMAIL = 'test@example.com'
const MOCK_DB_USER = { id: 'user-cuid-001', email: MOCK_USER_EMAIL, role: 'user' }
const MOCK_FORMAT = {
  id: 'preset-b5-novel',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

function makeMockAnalyzeResult(sceneCount = 2): AnalyzeResult {
  return {
    format: 'screenplay',
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      index: i,
      slug: `scene-${String(i).padStart(2, '0')}`,
      summary: `장면 ${i + 1} 요약`,
      meta: { emotion: 'neutral', view: 'front' as const },
      lines: [{ index: 0, speaker: '철수', text: `대사 ${i + 1}` }],
      characters: ['철수'],
      confidence: 0.9,
    })),
    characters: [{ name: '철수', mentionCount: sceneCount }],
    seed: 777,
    modelVersion: 'rule-only',
  }
}

function makeMockRecommendResult(sceneCount = 2): RecommendResult {
  return {
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      sceneIndex: i,
      poses: {
        철수: [
          {
            resourceId: `resource-pose-${i}`,
            characterId: 'char-dummyman',
            poseAction: 'standing',
            confidence: 0.8,
            reasoning: 'test',
          },
        ],
      },
      background: { suggestedTone: 'cream' as const, reasoning: 'test' },
      bubbles: [{ shape: 'rounded' as const, tailToSpeaker: true, reasoning: 'test' }],
      confidence: 0.8,
      seed: 777,
    })),
    seed: 777,
    modelVersion: 'rule-only',
  }
}

function makeMockFabricJson(pageIndex: number): PageFabricJson {
  return {
    v: 1,
    format: { id: 'preset-b5-novel', widthMm: 128, heightMm: 182, dpi: 350 },
    layers: [
      {
        id: `layer-bg-${pageIndex}`,
        kind: 'bg',
        data: { slotId: 'bg-slot', locked: false, visible: true },
        fabric: {
          type: 'rect',
          leftMm: 0,
          topMm: 0,
          widthMm: 128,
          heightMm: 182,
          fill: '#FFF5E6',
          zIndex: 0,
        },
      },
    ],
    _aiMeta: {
      generatedBy: 'ai-layout',
      seed: 777,
      schemaVersion: 1,
      sceneIndices: [pageIndex],
    },
  }
}

function makeMockComposeResult(pageCount = 2): ComposeResult {
  return {
    formatId: 'preset-b5-novel',
    pages: Array.from({ length: pageCount }, (_, i) => ({
      pageIndex: i,
      templateId: 'tmpl-default',
      fabricJson: makeMockFabricJson(i),
      sceneIndices: [i],
      warnings: [],
    })),
    warnings: [],
    seed: 777,
  }
}

// ─── Mock Prisma 팩토리 ───────────────────────────────────────────────────────

function makeMockTx() {
  return {
    project: {
      update: vi.fn().mockResolvedValue({ id: 'project-001' }),
      create: vi.fn().mockResolvedValue({ id: 'project-001' }),
    },
    sceneDoc: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'scenedoc-001' }),
    },
    page: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: { index: number } }) =>
          Promise.resolve({ id: `page-${data.index}`, index: data.index }),
        ),
    },
    scene: {
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: { index: number; summary: string } }) =>
          Promise.resolve({ id: `scene-${data.index}`, index: data.index, summary: data.summary }),
        ),
    },
    line: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }
}

function makeMockPrisma(
  overrides: {
    user?: unknown
    format?: unknown
    project?: unknown
    transaction?: unknown
  } = {},
) {
  const mockTx = makeMockTx()

  return {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides.user !== undefined ? overrides.user : MOCK_DB_USER),
    },
    format: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides.format !== undefined ? overrides.format : MOCK_FORMAT),
    },
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides.project !== undefined ? overrides.project : null),
    },
    $transaction:
      overrides.transaction ??
      vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        return fn(mockTx)
      }),
  }
}

// ─── Supabase Mock 팩토리 ────────────────────────────────────────────────────

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

// ─── Route 호출 헬퍼 ─────────────────────────────────────────────────────────

async function callRoute(body: unknown): Promise<{ status: number; data: unknown }> {
  const { POST } = await import('../../app/api/script/full-pipeline/route')

  const req = new Request('http://localhost:3000/api/script/full-pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const res = await POST(req as Parameters<typeof POST>[0])
  const data = (await res.json()) as unknown
  return { status: res.status, data }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('POST /api/script/full-pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 기본 mock 설정 (partial mock → any 캐스팅으로 타입 검사 완화)
    mockCreateWebServerClient.mockResolvedValue(makeMockSupabase() as any)
    mockGetPrismaClient.mockReturnValue(makeMockPrisma() as any)
    mockAnalyze.mockResolvedValue(makeMockAnalyzeResult(2))
    mockRecommend.mockResolvedValue(makeMockRecommendResult(2))
    mockCompose.mockResolvedValue(makeMockComposeResult(2))
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ── 1. 정상 파이프라인 ─────────────────────────────────────────────

  it('정상 요청 → 200 + projectId + pages + scenes + redirectTo', async () => {
    const { status, data } = await callRoute({
      scriptRaw: '철수: 안녕하세요!\n영희: 반갑습니다!',
      formatId: 'preset-b5-novel',
      title: '테스트 콘티',
      seed: 777,
    })

    expect(status).toBe(200)
    const resp = data as {
      projectId: string
      pages: unknown[]
      scenes: unknown[]
      warnings: string[]
      seed: number
      redirectTo: string
    }
    expect(resp.projectId).toBeTruthy()
    expect(resp.pages.length).toBeGreaterThan(0)
    expect(resp.scenes.length).toBeGreaterThan(0)
    expect(Array.isArray(resp.warnings)).toBe(true)
    expect(resp.seed).toBe(777)
    expect(resp.redirectTo).toMatch(/^\/editor\?projectId=/)
  })

  it('pages 각 항목에 id + pageIndex + thumbnail 포함', async () => {
    const { data } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: '테스트',
      seed: 0,
    })

    const resp = data as { pages: Array<{ id: string; pageIndex: number; thumbnail: null }> }
    const firstPage = resp.pages[0]
    expect(firstPage).toBeDefined()
    expect(typeof firstPage?.id).toBe('string')
    expect(typeof firstPage?.pageIndex).toBe('number')
    expect(firstPage?.thumbnail).toBeNull()
  })

  it('analyze → recommend → compose 순서 호출', async () => {
    await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: '순서 테스트',
      seed: 0,
    })

    expect(mockAnalyze).toHaveBeenCalledOnce()
    expect(mockRecommend).toHaveBeenCalledOnce()
    expect(mockCompose).toHaveBeenCalledOnce()
  })

  // ── 2. 인증 실패 ──────────────────────────────────────────────────

  it('미인증 → 401', async () => {
    mockCreateWebServerClient.mockResolvedValue(makeMockSupabase(false) as any)

    const { status } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: '인증없음',
    })

    expect(status).toBe(401)
  })

  // ── 3. 입력 검증 ──────────────────────────────────────────────────

  it('projectId 도 title 도 없으면 400', async () => {
    const { status } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      // title 없음, projectId 없음
    })

    expect(status).toBe(400)
  })

  it('scriptRaw 빈 문자열 → 400', async () => {
    const { status } = await callRoute({
      scriptRaw: '',
      formatId: 'preset-b5-novel',
      title: '빈 대본',
    })

    expect(status).toBe(400)
  })

  it('scriptRaw 50,001자 초과 → 400', async () => {
    const { status } = await callRoute({
      scriptRaw: 'a'.repeat(50_001),
      formatId: 'preset-b5-novel',
      title: '너무 긴 대본',
    })

    expect(status).toBe(400)
  })

  // ── 4. Format 없음 ────────────────────────────────────────────────

  it('존재하지 않는 formatId → 404', async () => {
    mockGetPrismaClient.mockReturnValue(makeMockPrisma({ format: null }) as any)

    const { status, data } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'non-existent-format',
      title: '포맷없음',
    })

    expect(status).toBe(404)
    const d = data as { error: string }
    expect(d.error).toContain('Format')
  })

  // ── 5. 기존 프로젝트 (projectId) ──────────────────────────────────

  it('projectId 있으면 기존 프로젝트 업데이트', async () => {
    mockGetPrismaClient.mockReturnValue(
      makeMockPrisma({
        project: { id: 'existing-project', ownerId: MOCK_DB_USER.id },
      }) as any,
    )

    const { status, data } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      projectId: 'existing-project',
      seed: 0,
    })

    expect(status).toBe(200)
    const resp = data as { projectId: string }
    expect(resp.projectId).toBeTruthy()
  })

  it('다른 사람의 projectId → 403', async () => {
    mockGetPrismaClient.mockReturnValue(
      makeMockPrisma({
        project: { id: 'others-project', ownerId: 'other-user-id' },
      }) as any,
    )

    const { status } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      projectId: 'others-project',
    })

    expect(status).toBe(403)
  })

  // ── 6. DB 트랜잭션 실패 ───────────────────────────────────────────

  it('DB 트랜잭션 실패 → 500', async () => {
    mockGetPrismaClient.mockReturnValue(
      makeMockPrisma({
        transaction: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      }) as any,
    )

    const { status } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: 'DB 실패 테스트',
    })

    expect(status).toBe(500)
  })

  // ── 7. llmEnabled 기본값 false ────────────────────────────────────

  it('llmEnabled 없으면 analyze 에 llmEnabled=false 전달', async () => {
    await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: 'LLM 기본값',
    })

    const analyzeCall = mockAnalyze.mock.calls[0]
    expect(analyzeCall?.[1]?.llmEnabled).toBe(false)
  })

  // ── 8. 결정론 (ADR-0007) ──────────────────────────────────────────

  it('같은 seed 입력 → compose 에 같은 seed 전달', async () => {
    await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: '결정론 테스트',
      seed: 42,
    })

    const composeCall = mockCompose.mock.calls[0]
    expect(composeCall?.[2]?.seed).toBe(42)

    const recommendCall = mockRecommend.mock.calls[0]
    expect(recommendCall?.[1]?.seed).toBe(42)
  })

  // ── 9. warnings 배열 (lowDpi 경고 포함) ──────────────────────────

  it('compose 경고 → 응답 warnings 에 포함', async () => {
    const warningMsg = '[lowDpi] resource-pose-0 : 슬롯이 너무 큽니다.'
    mockCompose.mockResolvedValueOnce({
      ...makeMockComposeResult(1),
      warnings: [warningMsg],
    })

    const { data } = await callRoute({
      scriptRaw: '철수: 안녕!',
      formatId: 'preset-b5-novel',
      title: '경고 테스트',
      seed: 0,
    })

    const resp = data as { warnings: string[] }
    expect(resp.warnings).toContain(warningMsg)
  })

  // ── 10. GET 차단 ──────────────────────────────────────────────────

  it('GET → 405', async () => {
    const { GET } = await import('../../app/api/script/full-pipeline/route')
    const res = GET()
    expect(res.status).toBe(405)
  })
})
