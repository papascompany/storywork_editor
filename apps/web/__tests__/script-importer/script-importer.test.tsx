/**
 * ScriptImporterShell + 하위 컴포넌트 단위 테스트 (M4-04 Step 2)
 *
 * Mock: fetch, next/navigation
 * 검증:
 *   - Wizard 렌더 및 단계 진행
 *   - 대본 입력 → 다음 버튼 활성화
 *   - 판형 선택 카드 변경
 *   - 자동 생성 호출 + 결과 미리보기
 *   - 경고 메시지 표시
 *   - 편집기 진입 (router.push)
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── 모킹 ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

// ─── Import (vi.mock 호이스팅 이후 — eslint-disable 유지) ─────────────────────

import { ContiBoard } from '../../components/editor/script-importer/ContiBoard'
import { PipelineWarnings } from '../../components/editor/script-importer/PipelineWarnings'
import { PreviewPages } from '../../components/editor/script-importer/PreviewPages'
import { ScriptImporterShell } from '../../components/editor/script-importer/ScriptImporterShell'
import { ScriptInputArea } from '../../components/editor/script-importer/ScriptInputArea'
import type {
  ContiAnalyzeResponse,
  FullPipelineResponse,
} from '../../components/editor/script-importer/types'

const mockUseRouter = vi.mocked(useRouter)

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const SAMPLE_SCRIPT = '철수: 안녕하세요!\n영희: 반갑습니다!\n철수: 오늘 날씨가 좋네요.'

const MOCK_ANALYZE_RESULT: ContiAnalyzeResponse = {
  scenes: [
    {
      index: 0,
      slug: 'scene-01',
      summary: '철수와 영희의 인사',
      lines: [
        { index: 0, speaker: '철수', text: '안녕하세요!' },
        { index: 1, speaker: '영희', text: '반갑습니다!' },
      ],
      characters: ['철수', '영희'],
      meta: { emotion: 'happy' },
    },
    {
      index: 1,
      slug: 'scene-02',
      summary: '날씨 이야기',
      lines: [{ index: 0, speaker: '철수', text: '오늘 날씨가 좋네요.' }],
      characters: ['철수'],
      meta: { emotion: 'neutral' },
    },
  ],
  characters: [
    { name: '철수', mentionCount: 2 },
    { name: '영희', mentionCount: 1 },
  ],
  seed: 0,
  modelVersion: 'rule-only',
}

const MOCK_PIPELINE_RESULT: FullPipelineResponse = {
  projectId: 'proj-test-001',
  pages: [
    { id: 'page-0', pageIndex: 0, thumbnail: null },
    { id: 'page-1', pageIndex: 1, thumbnail: null },
  ],
  scenes: [
    { id: 'scene-0', index: 0, summary: '철수와 영희의 인사' },
    { id: 'scene-1', index: 1, summary: '날씨 이야기' },
  ],
  warnings: [],
  seed: 777,
  redirectTo: '/editor?projectId=proj-test-001',
}

/** fetch mock: 1번째 호출 = analyze(콘티), 2번째 호출 = full-pipeline */
function mockAnalyzeThenPipeline(): ReturnType<typeof vi.fn> {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_ANALYZE_RESULT),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PIPELINE_RESULT),
    } as Response)
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

/** Step 1~3 통과 후 콘티 단계 진입 헬퍼 */
async function walkToConti(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
  await user.type(textarea, SAMPLE_SCRIPT)
  await user.click(screen.getByRole('button', { name: /다음/ }))
  await user.click(screen.getByRole('button', { name: /다음/ }))
  await user.click(screen.getByRole('button', { name: /콘티 생성/ }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /페이지 생성/ })).toBeDefined()
  })
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('ScriptInputArea', () => {
  it('빈 textarea 에서 "다음" 버튼 비활성화', () => {
    render(
      <ScriptInputArea
        scriptRaw=""
        onScriptChange={vi.fn()}
        selectedFormatId="preset-b5-novel"
        onFormatChange={vi.fn()}
        onNext={vi.fn()}
      />,
    )

    const nextBtn = screen.getByRole('button', { name: /다음/ })
    expect(nextBtn).toBeDisabled()
  })

  it('대본 입력 시 "다음" 버튼 활성화', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()

    render(
      <ScriptInputArea
        scriptRaw={SAMPLE_SCRIPT}
        onScriptChange={vi.fn()}
        selectedFormatId="preset-b5-novel"
        onFormatChange={vi.fn()}
        onNext={onNext}
      />,
    )

    const nextBtn = screen.getByRole('button', { name: /다음/ })
    expect(nextBtn).not.toBeDisabled()
    await user.click(nextBtn)
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('판형 카드 4개 렌더', () => {
    render(
      <ScriptInputArea
        scriptRaw=""
        onScriptChange={vi.fn()}
        selectedFormatId="preset-b5-novel"
        onFormatChange={vi.fn()}
        onNext={vi.fn()}
      />,
    )

    expect(screen.getByText(/B5 소설/)).toBeDefined()
    expect(screen.getByText(/A5 아트북/)).toBeDefined()
    expect(screen.getByText(/정사각형/)).toBeDefined()
    expect(screen.getByText(/모바일 웹툰/)).toBeDefined()
  })

  it('판형 변경 시 onFormatChange 호출', async () => {
    const user = userEvent.setup()
    const onFormatChange = vi.fn()

    render(
      <ScriptInputArea
        scriptRaw=""
        onScriptChange={vi.fn()}
        selectedFormatId="preset-b5-novel"
        onFormatChange={onFormatChange}
        onNext={vi.fn()}
      />,
    )

    const a5Button = screen.getByText(/A5 아트북/).closest('button')
    if (a5Button) {
      await user.click(a5Button)
      expect(onFormatChange).toHaveBeenCalledWith('preset-a5-artbook')
    }
  })

  it('글자 수 카운터 표시', () => {
    render(
      <ScriptInputArea
        scriptRaw={SAMPLE_SCRIPT}
        onScriptChange={vi.fn()}
        selectedFormatId="preset-b5-novel"
        onFormatChange={vi.fn()}
        onNext={vi.fn()}
      />,
    )

    // "50,000" 이 label과 counter에 두 곳 → getAllByText 사용
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThanOrEqual(1)
  })
})

describe('PipelineWarnings', () => {
  it('경고 없으면 렌더 안 함', () => {
    const { container } = render(<PipelineWarnings warnings={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('lowDpi 경고 표시', () => {
    render(<PipelineWarnings warnings={['[lowDpi] resource-001: 슬롯이 너무 큽니다.']} />)
    expect(screen.getByText(/저해상도/)).toBeDefined()
  })

  it('slot-empty 경고 표시', () => {
    render(<PipelineWarnings warnings={['[slot-empty] 장면 0 포즈 슬롯에 포즈 없음.']} />)
    expect(screen.getByText(/슬롯 미배치/)).toBeDefined()
  })

  it('여러 경고 모두 렌더', () => {
    render(
      <PipelineWarnings
        warnings={['[lowDpi] resource-001: 경고 1', '[slot-empty] 경고 2', '[safe-area] 경고 3']}
      />,
    )
    expect(screen.getByText(/3개 주의/)).toBeDefined()
  })
})

describe('PreviewPages', () => {
  it('생성된 페이지 N개 미리보기 카드 렌더', () => {
    const onOpenEditor = vi.fn()
    const onBack = vi.fn()

    render(
      <PreviewPages
        result={MOCK_PIPELINE_RESULT}
        formatLabel="B5 소설"
        onOpenEditor={onOpenEditor}
        onBack={onBack}
      />,
    )

    // 2페이지 미리보기
    expect(screen.getByText(/2페이지/)).toBeDefined()
    // 장면 요약
    expect(screen.getByText(/철수와 영희의 인사/)).toBeDefined()
    expect(screen.getByText(/날씨 이야기/)).toBeDefined()
  })

  it('"편집기에서 열기" 버튼 클릭 → onOpenEditor 호출', async () => {
    const user = userEvent.setup()
    const onOpenEditor = vi.fn()

    render(
      <PreviewPages
        result={MOCK_PIPELINE_RESULT}
        formatLabel="B5 소설"
        onOpenEditor={onOpenEditor}
        onBack={vi.fn()}
      />,
    )

    const openBtn = screen.getByRole('button', { name: /편집기에서 열기/ })
    await user.click(openBtn)
    expect(onOpenEditor).toHaveBeenCalledOnce()
  })

  it('"콘티로 돌아가기" 버튼 → onBack 호출', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(
      <PreviewPages
        result={MOCK_PIPELINE_RESULT}
        formatLabel="B5 소설"
        onOpenEditor={vi.fn()}
        onBack={onBack}
      />,
    )

    const backBtn = screen.getByRole('button', { name: /콘티로 돌아가기/ })
    await user.click(backBtn)
    expect(onBack).toHaveBeenCalledOnce()
  })
})

describe('ContiBoard — 콘티 확정 단계 (CONTI-03)', () => {
  const baseProps = {
    conti: MOCK_ANALYZE_RESULT,
    excludedSceneIndices: [] as number[],
    onToggleExclude: vi.fn(),
    onRegenerate: vi.fn(),
    showRegenerate: false,
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    isGenerating: false,
    seed: 0,
  }

  it('컷 카드 목록 렌더 — 지문·화자·대사·감정', () => {
    render(<ContiBoard {...baseProps} />)
    expect(screen.getByText(/철수와 영희의 인사/)).toBeDefined()
    expect(screen.getByText(/날씨 이야기/)).toBeDefined()
    expect(screen.getByText('기쁨')).toBeDefined()
    expect(screen.getByText(/안녕하세요!/)).toBeDefined()
    expect(screen.getAllByText(/2컷/).length).toBeGreaterThan(0)
  })

  it('rule-only(showRegenerate=false)에서는 재생성 버튼 미노출', () => {
    render(<ContiBoard {...baseProps} />)
    expect(screen.queryByRole('button', { name: /다르게 재생성/ })).toBeNull()
  })

  it('제외 토글 클릭 → onToggleExclude(sceneIndex)', async () => {
    const user = userEvent.setup()
    const onToggleExclude = vi.fn()
    render(<ContiBoard {...baseProps} onToggleExclude={onToggleExclude} />)

    await user.click(screen.getByRole('button', { name: '1번 컷 제외' }))
    expect(onToggleExclude).toHaveBeenCalledWith(0)
  })

  it('제외된 컷은 복원 버튼 + 사용 컷 수 감소 반영', () => {
    render(<ContiBoard {...baseProps} excludedSceneIndices={[1]} />)
    expect(screen.getByRole('button', { name: '2번 컷 복원' })).toBeDefined()
    expect(screen.getAllByText(/1컷/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /1컷으로 페이지 생성/ })).toBeDefined()
  })

  it('전체 제외 시 확정 버튼 비활성화', () => {
    render(<ContiBoard {...baseProps} excludedSceneIndices={[0, 1]} />)
    expect(screen.getByRole('button', { name: /페이지 생성/ })).toBeDisabled()
  })

  it('"다르게 재생성" → onRegenerate 호출 (LLM 분석 모드)', async () => {
    const user = userEvent.setup()
    const onRegenerate = vi.fn()
    render(<ContiBoard {...baseProps} showRegenerate onRegenerate={onRegenerate} />)

    await user.click(screen.getByRole('button', { name: /다르게 재생성/ }))
    expect(onRegenerate).toHaveBeenCalledOnce()
    expect(screen.getByText(/변주 #0/)).toBeDefined()
  })

  it('0컷 콘티 → 막다른 상태 안내 렌더', () => {
    render(<ContiBoard {...baseProps} conti={{ ...MOCK_ANALYZE_RESULT, scenes: [] }} />)
    expect(screen.getByText(/컷을 만들지 못했습니다/)).toBeDefined()
    expect(screen.queryByRole('button', { name: /페이지 생성/ })).toBeNull()
  })

  it('긴 대사 펼치기 — "더 보기" 토글로 전체 대사 노출', async () => {
    const user = userEvent.setup()
    const baseScene = MOCK_ANALYZE_RESULT.scenes[0]
    if (!baseScene) throw new Error('fixture scene missing')
    const longConti = {
      ...MOCK_ANALYZE_RESULT,
      scenes: [
        {
          ...baseScene,
          lines: Array.from({ length: 5 }, (_, i) => ({
            index: i,
            speaker: '철수',
            text: `대사 ${i + 1}`,
          })),
        },
      ],
    }
    render(<ContiBoard {...baseProps} conti={longConti} />)
    expect(screen.queryByText(/대사 5/)).toBeNull()
    await user.click(screen.getByRole('button', { name: /대사 2개 더 보기/ }))
    expect(screen.getByText(/대사 5/)).toBeDefined()
  })
})

describe('ScriptImporterShell — Wizard 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    })
  })

  it('초기 렌더: Step 1 (대본 입력) 표시', () => {
    render(<ScriptImporterShell />)
    expect(screen.getByText(/대본 붙여넣기/)).toBeDefined()
    expect(screen.getByText(/판형 선택/)).toBeDefined()
  })

  it('진행 표시 (스텝 인디케이터) 렌더 — 5단계', () => {
    render(<ScriptImporterShell />)
    expect(screen.getByText(/대본 입력/)).toBeDefined()
    expect(screen.getByText(/판형 확인/)).toBeDefined()
    expect(screen.getByText(/캐릭터 매핑/)).toBeDefined()
    expect(screen.getByText(/콘티 확정/)).toBeDefined()
    expect(screen.getByText(/미리보기/)).toBeDefined()
  })

  it('Step 1 → 2: 대본 입력 후 "다음" 클릭 → 판형 확인 단계', async () => {
    const user = userEvent.setup()
    render(<ScriptImporterShell />)

    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)

    const nextBtn = screen.getByRole('button', { name: /다음/ })
    await user.click(nextBtn)

    // "판형 확인"이 step indicator + heading 두 곳 → getAllByText
    expect(screen.getAllByText(/판형 확인/).length).toBeGreaterThan(0)
    // 선택된 판형 요약 카드 (B5 소설이 여러 곳)
    expect(screen.getAllByText(/B5 소설/).length).toBeGreaterThan(0)
  })

  it('Step 2 → 3: "다음" 클릭 → 캐릭터 매핑 단계', async () => {
    const user = userEvent.setup()
    render(<ScriptImporterShell />)

    // Step 1 통과
    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)
    await user.click(screen.getByRole('button', { name: /다음/ }))

    // Step 2 → 3
    const nextBtn = screen.getByRole('button', { name: /다음/ })
    await user.click(nextBtn)

    // "캐릭터 매핑" 텍스트가 step indicator + heading 2곳에 있음 → getAllByText
    expect(screen.getAllByText(/캐릭터 매핑/).length).toBeGreaterThan(0)
  })

  it('콘티 생성 → Step 4 콘티 확정 (무영속 분석 결과 표시)', async () => {
    const user = userEvent.setup()
    const fetchMock = mockAnalyzeThenPipeline()

    render(<ScriptImporterShell />)
    await walkToConti(user)

    // 콘티 단계: 컷 카드 + analyze 만 호출됨 (full-pipeline 미호출)
    expect(screen.getByText(/철수와 영희의 인사/)).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const analyzeCall = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(analyzeCall[0]).toBe('/api/script/analyze')
    const analyzeBody = JSON.parse(analyzeCall[1].body) as { seed: number; projectId?: string }
    expect(analyzeBody.seed).toBe(0) // ADR-0007: 초기 시드 0 고정
    expect(analyzeBody.projectId).toBeUndefined() // 무영속 모드
  })

  it('콘티 확정 → full-pipeline 호출(excludeSceneIndices 포함) → 미리보기', async () => {
    const user = userEvent.setup()
    const fetchMock = mockAnalyzeThenPipeline()

    render(<ScriptImporterShell />)
    await walkToConti(user)

    // 2번 컷 제외 후 확정
    await user.click(screen.getByRole('button', { name: '2번 컷 제외' }))
    await user.click(screen.getByRole('button', { name: /1컷으로 페이지 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })
    expect(screen.getByText(/2페이지/)).toBeDefined()

    const pipelineCall = fetchMock.mock.calls[1] as [string, { body: string }]
    expect(pipelineCall[0]).toBe('/api/script/full-pipeline')
    const body = JSON.parse(pipelineCall[1].body) as {
      seed: number
      excludeSceneIndices: number[]
    }
    expect(body.seed).toBe(0) // 콘티와 같은 시드 유지 (결정론 일치)
    expect(body.excludeSceneIndices).toEqual([1])
  })

  it('"다르게 재생성" → 시드 +1 로 analyze 재호출 + 동일 콘티면 제외 목록 보존 (LLM 모드)', async () => {
    const user = userEvent.setup()
    const llmResult = { ...MOCK_ANALYZE_RESULT, modelVersion: 'claude-sonnet-4-6' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(llmResult),
    } as Response)
    global.fetch = fetchMock as unknown as typeof fetch

    render(<ScriptImporterShell />)
    await walkToConti(user)

    // 컷 제외 후 재생성 — 동일 콘티가 돌아오면 제외가 보존되어야 한다
    await user.click(screen.getByRole('button', { name: '2번 컷 제외' }))
    await user.click(screen.getByRole('button', { name: /다르게 재생성/ }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1] as [string, { body: string }])[1].body,
    ) as { seed: number }
    expect(secondBody.seed).toBe(1)
    expect(screen.getByRole('button', { name: '2번 컷 복원' })).toBeDefined()
  })

  it('콘티 → 이전 → 콘티 생성 재진입: 재분석 없이 복귀 + 제외 보존', async () => {
    const user = userEvent.setup()
    const fetchMock = mockAnalyzeThenPipeline()

    render(<ScriptImporterShell />)
    await walkToConti(user)
    await user.click(screen.getByRole('button', { name: '2번 컷 제외' }))

    await user.click(screen.getByRole('button', { name: /이전/ }))
    await user.click(screen.getByRole('button', { name: /콘티 생성/ }))

    // 동일 대본·시드 — 네트워크 재호출 없이 콘티 복귀, 제외 유지
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '2번 컷 복원' })).toBeDefined()
  })

  it('재확정 시 직전 projectId 재사용 — 중복 프로젝트 생성 방지', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_ANALYZE_RESULT),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_PIPELINE_RESULT),
      } as Response)
    global.fetch = fetchMock as unknown as typeof fetch

    render(<ScriptImporterShell />)
    await walkToConti(user)
    await user.click(screen.getByRole('button', { name: /페이지 생성/ }))
    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })

    // 콘티로 돌아가 재확정 → 두 번째 full-pipeline 호출에 projectId 포함
    await user.click(screen.getByRole('button', { name: /콘티로 돌아가기/ }))
    await user.click(screen.getByRole('button', { name: /페이지 생성/ }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
    const secondConfirm = JSON.parse(
      (fetchMock.mock.calls[2] as [string, { body: string }])[1].body,
    ) as { projectId?: string }
    expect(secondConfirm.projectId).toBe('proj-test-001')
  })

  it('콘티 확정(full-pipeline) 실패 → 콘티 단계에 에러 배너(role=alert)', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_ANALYZE_RESULT),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: '페이지 생성에 실패했습니다.' }),
      } as Response)
    global.fetch = fetchMock as unknown as typeof fetch

    render(<ScriptImporterShell />)
    await walkToConti(user)
    await user.click(screen.getByRole('button', { name: /페이지 생성/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByText(/페이지 생성에 실패했습니다./)).toBeDefined()
    })
  })

  it('콘티 생성 실패 → 에러 메시지 표시', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: '서버 오류가 발생했습니다.' }),
    } as Response) as unknown as typeof fetch

    render(<ScriptImporterShell />)

    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /콘티 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/서버 오류가 발생했습니다./)).toBeDefined()
    })
  })

  it('미리보기 "콘티로 돌아가기" → 콘티 단계 복귀 (시드·컷 유지)', async () => {
    const user = userEvent.setup()
    mockAnalyzeThenPipeline()

    render(<ScriptImporterShell />)
    await walkToConti(user)
    await user.click(screen.getByRole('button', { name: /페이지 생성/ }))
    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })

    await user.click(screen.getByRole('button', { name: /콘티로 돌아가기/ }))
    // 재분석 없이 콘티 카드가 다시 보인다
    expect(screen.getByText(/철수와 영희의 인사/)).toBeDefined()
  })

  it('미리보기에서 "편집기에서 열기" → router.push 호출', async () => {
    const mockPush = vi.fn()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    })

    const user = userEvent.setup()
    mockAnalyzeThenPipeline()

    render(<ScriptImporterShell />)
    await walkToConti(user)
    await user.click(screen.getByRole('button', { name: /페이지 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })

    await user.click(screen.getByRole('button', { name: /편집기에서 열기/ }))
    expect(mockPush).toHaveBeenCalledWith('/editor?projectId=proj-test-001')
  })
})
