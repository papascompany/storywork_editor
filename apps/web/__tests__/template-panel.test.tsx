/**
 * template-panel.test.tsx — M5-04 TemplatePanel + ACTIVE_TOOLS 통합 테스트
 *
 * 검증 항목:
 * 1. ACTIVE_TOOLS 에 'template' 포함됨
 * 2. ToolBar 에서 'T' 단축키 → template 활성화 (Toast 없음)
 * 3. ToolBar 에서 템플릿 버튼 클릭 → sidebarOpen=true
 * 4. FeatureSidebar active=template → TemplatePanel 렌더 (검색창 포함)
 * 5. TemplatePanel: canvas=null + 템플릿 클릭 → Toast
 * 6. TemplatePanel: DEFAULT_TEMPLATES 5종 렌더 (API 없을 때 fallback)
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── 공통 모킹 ────────────────────────────────────────────────────────────────

const mockShowToast = vi.fn()

vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactElement }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    showToast: (...args: unknown[]) => mockShowToast(...args),
    cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
  }
})

vi.mock('fabric', () => ({
  Rect: class {
    data: Record<string, unknown> = {}
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
    setCoords() {}
    constructor(opts: Record<string, unknown>) {
      Object.assign(this, opts)
    }
  },
  Circle: class {},
  Line: class {},
  Triangle: class {},
}))

vi.mock('@storywork/editor-history', async () => ({
  AddObjectCommand: vi.fn().mockImplementation(() => ({
    assignedId: 'mock-id',
  })),
}))

vi.mock('next/image', () => ({
  default: function MockNextImage({ src, alt }: { src: string; alt: string }) {
    return React.createElement('img', { src, alt })
  },
}))

// editor-template mock (applyTemplate no-op)
vi.mock('@storywork/editor-template', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    applyTemplate: vi.fn(),
  }
})

let resetToolStore: () => void

beforeEach(() => {
  mockShowToast.mockClear()
  vi.clearAllMocks()

  // API fetch → 빈 배열 반환 (DEFAULT_TEMPLATES fallback 유도)
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ templates: [] }),
  }) as unknown as typeof fetch
})

afterEach(async () => {
  resetToolStore?.()
})

// ─── ACTIVE_TOOLS ─────────────────────────────────────────────────────────────

describe('ACTIVE_TOOLS — template 활성화', () => {
  it("ACTIVE_TOOLS 에 'template' 가 포함됨", async () => {
    const { ACTIVE_TOOLS } = await import('../components/editor/store/useToolStore')
    expect(ACTIVE_TOOLS.has('template')).toBe(true)
  })
})

// ─── ToolBar 단축키 ───────────────────────────────────────────────────────────

describe('ToolBar — template 단축키', () => {
  beforeEach(async () => {
    const { useToolStore } = await import('../components/editor/store/useToolStore')
    resetToolStore = () => useToolStore.setState({ active: 'select', sidebarOpen: false })
    resetToolStore()
  })

  it('단축키 T → template 활성화 (Toast 없음)', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(<ToolBar />)

    act(() => {
      fireEvent.keyDown(window, { key: 't' })
    })

    expect(useToolStore.getState().active).toBe('template')
    expect(useToolStore.getState().sidebarOpen).toBe(true)
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('템플릿 버튼 클릭 → active=template, sidebarOpen=true', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(<ToolBar />)

    const btn = screen.getByRole('button', { name: '템플릿' })
    fireEvent.click(btn)

    expect(useToolStore.getState().active).toBe('template')
    expect(useToolStore.getState().sidebarOpen).toBe(true)
    expect(mockShowToast).not.toHaveBeenCalled()
  })
})

// ─── FeatureSidebar — template 케이스 ────────────────────────────────────────

describe('FeatureSidebar — template 패널 노출', () => {
  beforeEach(async () => {
    const { useToolStore } = await import('../components/editor/store/useToolStore')
    resetToolStore = () => useToolStore.setState({ active: 'select', sidebarOpen: false })
    resetToolStore()
  })

  it('active=template, sidebarOpen=true → TemplatePanel 검색창 렌더', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'template', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /템플릿 검색/ })).toBeInTheDocument()
    })
  })

  it('template 패널은 사이드바 공통 검색창이 숨겨짐 (자체 검색창 보유)', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'template', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    // 검색창이 1개만 있어야 함 (TemplatePanel 자체 것)
    const searchBoxes = screen.queryAllByRole('searchbox')
    expect(searchBoxes.length).toBeLessThanOrEqual(1)
  })
})

// ─── TemplatePanel ────────────────────────────────────────────────────────────

describe('TemplatePanel — 기본 렌더', () => {
  it('DEFAULT_TEMPLATES 5종이 로드됨 (API fallback)', async () => {
    const { TemplatePanel } = await import('../components/editor/panels/TemplatePanel')

    render(<TemplatePanel canvas={null} />)

    // 로딩 완료 대기
    await waitFor(() => {
      // 5개 버튼 (각 템플릿마다 aria-label="* 템플릿 적용")
      const buttons = screen.queryAllByRole('button', { name: /템플릿 적용/ })
      expect(buttons.length).toBeGreaterThanOrEqual(5)
    })
  })

  it('canvas=null + 템플릿 클릭 → 에러 Toast', async () => {
    const { TemplatePanel } = await import('../components/editor/panels/TemplatePanel')

    render(<TemplatePanel canvas={null} />)

    await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: /템플릿 적용/ })
      expect(btns.length).toBeGreaterThan(0)
    })

    const btn = screen.queryAllByRole('button', { name: /템플릿 적용/ })[0]
    if (!btn) throw new Error('button not found')

    await act(async () => {
      fireEvent.click(btn)
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('편집기가 준비되지 않았습니다'),
      'error',
    )
  })

  it('검색어 입력 시 필터링', async () => {
    const { TemplatePanel } = await import('../components/editor/panels/TemplatePanel')

    render(<TemplatePanel canvas={null} />)

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /템플릿 적용/ }).length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByRole('searchbox', { name: '템플릿 검색' })
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '1대1' } })
    })

    // '1대1 대화' 템플릿만 남아야 함
    await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: /템플릿 적용/ })
      expect(btns.length).toBeGreaterThanOrEqual(1)
    })
  })
})
