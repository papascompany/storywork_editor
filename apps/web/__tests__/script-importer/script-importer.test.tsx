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

import { PipelineWarnings } from '../../components/editor/script-importer/PipelineWarnings'
import { PreviewPages } from '../../components/editor/script-importer/PreviewPages'
import { ScriptImporterShell } from '../../components/editor/script-importer/ScriptImporterShell'
import { ScriptInputArea } from '../../components/editor/script-importer/ScriptInputArea'
import type { FullPipelineResponse } from '../../components/editor/script-importer/types'

const mockUseRouter = vi.mocked(useRouter)

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const SAMPLE_SCRIPT = '철수: 안녕하세요!\n영희: 반갑습니다!\n철수: 오늘 날씨가 좋네요.'

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

  it('"다시 생성" 버튼 → onBack 호출', async () => {
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

    const backBtn = screen.getByRole('button', { name: /다시 생성/ })
    await user.click(backBtn)
    expect(onBack).toHaveBeenCalledOnce()
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

  it('진행 표시 (스텝 인디케이터) 렌더', () => {
    render(<ScriptImporterShell />)
    expect(screen.getByText(/대본 입력/)).toBeDefined()
    expect(screen.getByText(/판형 확인/)).toBeDefined()
    expect(screen.getByText(/캐릭터 매핑/)).toBeDefined()
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

  it('생성 성공 → Step 4 미리보기', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PIPELINE_RESULT),
    } as Response)

    render(<ScriptImporterShell />)

    // Step 1
    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)
    await user.click(screen.getByRole('button', { name: /다음/ }))

    // Step 2
    await user.click(screen.getByRole('button', { name: /다음/ }))

    // Step 3 → 자동 생성
    await user.click(screen.getByRole('button', { name: /자동 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })

    expect(screen.getByText(/2페이지/)).toBeDefined()
  })

  it('생성 실패 → 에러 메시지 표시', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: '서버 오류가 발생했습니다.' }),
    } as Response)

    render(<ScriptImporterShell />)

    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /자동 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/서버 오류가 발생했습니다./)).toBeDefined()
    })
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PIPELINE_RESULT),
    } as Response)

    render(<ScriptImporterShell />)

    const textarea = screen.getByRole('textbox', { name: /대본 붙여넣기/ })
    await user.type(textarea, SAMPLE_SCRIPT)
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.click(screen.getByRole('button', { name: /자동 생성/ }))

    await waitFor(() => {
      expect(screen.getByText(/자동 생성 완료/)).toBeDefined()
    })

    await user.click(screen.getByRole('button', { name: /편집기에서 열기/ }))
    expect(mockPush).toHaveBeenCalledWith('/editor?projectId=proj-test-001')
  })
})
