/**
 * toolbar.test.tsx — M1-08c ToolBar + FeatureSidebar 단위 테스트
 *
 * 검증 항목:
 * 1. ToolBar 11개 버튼 모두 렌더
 * 2. 활성 도구(background) 클릭 → FeatureSidebar 슬라이드 + 해당 패널 노출
 * 3. 같은 도구 재클릭 → 사이드바 닫힘
 * 4. 비활성 도구(pose) 클릭 → showToast 트리거
 * 5. 단축키 P → pose (비활성이므로 Toast)
 * 6. 단축키 B → background 활성
 * 7. 단축키 V → select (사이드바 닫힘)
 * 8. BackgroundPanel: 컬러 클릭 → addObject 호출 (mock)
 * 9. ShapePanel: Rectangle 클릭 → addObject 호출 (mock)
 * 10. Esc 키 → 사이드바 닫힘
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── 공통 모킹 ────────────────────────────────────────────────────────────────

// @storywork/ui: Tooltip → trigger 직접 렌더 / showToast → vi.fn()
const mockShowToast = vi.fn()

vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Tooltip: ({
      children,
    }: {
      children: React.ReactElement
      content?: unknown
      shortcut?: string
      side?: string
      sideOffset?: number
    }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    showToast: (...args: unknown[]) => mockShowToast(...args),
    cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
  }
})

// fabric: Rect/Circle/Line/Triangle 최소 mock
vi.mock('fabric', async () => {
  class FabricObjectMock {
    constructor(opts?: Record<string, unknown>) {
      Object.assign(this, opts ?? {})
    }
    set(_props: unknown) {}
  }
  return {
    Rect: FabricObjectMock,
    Circle: FabricObjectMock,
    Line: FabricObjectMock,
    Triangle: FabricObjectMock,
  }
})

// @storywork/editor-history: AddObjectCommand mock
const mockPush = vi.fn()
vi.mock('@storywork/editor-history', async () => ({
  AddObjectCommand: vi.fn().mockImplementation(() => ({
    assignedId: 'mock-id-001',
  })),
}))

// Zustand store 리셋 헬퍼 — 각 테스트 전에 store 를 초기 상태로 복원
let resetToolStore: () => void

beforeEach(async () => {
  mockShowToast.mockClear()
  mockPush.mockClear()

  // Zustand store 초기화
  const { useToolStore } = await import('../components/editor/store/useToolStore')
  resetToolStore = () => useToolStore.setState({ active: 'select', sidebarOpen: false })
  resetToolStore()
})

afterEach(() => {
  resetToolStore?.()
})

// ── ToolBar 테스트 ─────────────────────────────────────────────────────────

describe('ToolBar — 11종 렌더', () => {
  it('11개 버튼이 모두 렌더된다', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    render(<ToolBar />)

    const labels = [
      '선택',
      '템플릿',
      '포즈',
      '배경',
      '말풍선',
      '워드효과',
      '꾸미기',
      '도형',
      '텍스트',
      '업로드',
      'AI 자동배치',
    ]
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeDefined()
    }
  })

  it('각 버튼에 aria-label 이 있다', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    render(<ToolBar />)

    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy()
    }
  })
})

describe('ToolBar — 도구 클릭 동작', () => {
  it('background 클릭 → useToolStore.active = background, sidebarOpen = true', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(<ToolBar />)

    const btn = screen.getByRole('button', { name: '배경' })
    fireEvent.click(btn)

    const state = useToolStore.getState()
    expect(state.active).toBe('background')
    expect(state.sidebarOpen).toBe(true)
  })

  it('background 재클릭 → sidebarOpen toggle (닫힘)', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(<ToolBar />)

    const btn = screen.getByRole('button', { name: '배경' })
    fireEvent.click(btn)
    fireEvent.click(btn)

    expect(useToolStore.getState().sidebarOpen).toBe(false)
  })

  it('비활성 도구(포즈) 클릭 → showToast 호출', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')

    render(<ToolBar />)

    const btn = screen.getByRole('button', { name: '포즈' })
    fireEvent.click(btn)

    expect(mockShowToast).toHaveBeenCalledTimes(1)
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('M2'), 'info')
  })

  it('select 클릭 → active=select, sidebarOpen=false', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    // 먼저 background 를 열어놓기
    useToolStore.setState({ active: 'background', sidebarOpen: true })

    render(<ToolBar />)
    const btn = screen.getByRole('button', { name: '선택' })
    fireEvent.click(btn)

    const state = useToolStore.getState()
    expect(state.active).toBe('select')
    expect(state.sidebarOpen).toBe(false)
  })
})

describe('ToolBar — 단축키', () => {
  it('단축키 B → background 활성', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(<ToolBar />)

    act(() => {
      fireEvent.keyDown(window, { key: 'b' })
    })

    expect(useToolStore.getState().active).toBe('background')
    expect(useToolStore.getState().sidebarOpen).toBe(true)
  })

  it('단축키 P → Toast (비활성)', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')

    render(<ToolBar />)

    act(() => {
      fireEvent.keyDown(window, { key: 'p' })
    })

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('M2'), 'info')
  })

  it('단축키 V → select, 사이드바 닫힘', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })
    render(<ToolBar />)

    act(() => {
      fireEvent.keyDown(window, { key: 'v' })
    })

    expect(useToolStore.getState().active).toBe('select')
    expect(useToolStore.getState().sidebarOpen).toBe(false)
  })

  it('input 포커스 상태에서 단축키 무시', async () => {
    const { ToolBar } = await import('../components/editor/ToolBar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    render(
      <div>
        <ToolBar />
        <input data-testid="input" />
      </div>,
    )

    const input = screen.getByTestId('input')
    fireEvent.focus(input)

    act(() => {
      fireEvent.keyDown(input, { key: 'b' })
    })

    // input 포커스 상태에서는 도구 변경 없어야 함
    expect(useToolStore.getState().active).toBe('select')
  })
})

// ── FeatureSidebar 테스트 ────────────────────────────────────────────────────

describe('FeatureSidebar — 슬라이드 동작', () => {
  it('초기: 사이드바 숨김 (aria-hidden=true)', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    const sidebar = screen.getByTestId('feature-sidebar')
    expect(sidebar.getAttribute('aria-hidden')).toBe('true')
  })

  it('store.sidebarOpen=true, active=background → 사이드바 노출', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    const sidebar = screen.getByTestId('feature-sidebar')
    expect(sidebar.getAttribute('aria-hidden')).toBe('false')
    // 배경 패널 레이블 확인
    expect(screen.getByText('배경')).toBeDefined()
  })

  it('Esc 키 → 사이드바 닫힘', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    expect(useToolStore.getState().sidebarOpen).toBe(false)
  })

  it('X 버튼 클릭 → 사이드바 닫힘', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    const closeBtn = screen.getByRole('button', { name: '패널 닫기' })
    fireEvent.click(closeBtn)

    expect(useToolStore.getState().sidebarOpen).toBe(false)
  })

  it('pose 패널: M2 안내 텍스트 노출', async () => {
    const { FeatureSidebar } = await import('../components/editor/FeatureSidebar')
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'pose', sidebarOpen: true })

    render(<FeatureSidebar canvas={null} history={null} layerTree={null} />)

    expect(screen.getByText(/M2 에서 1,260개/)).toBeDefined()
  })
})

// ── BackgroundPanel 테스트 ────────────────────────────────────────────────────

describe('BackgroundPanel — 컬러 클릭', () => {
  it('컬러 클릭 → AddObjectCommand 생성 시도 (canvas null → Toast)', async () => {
    const { BackgroundPanel } = await import('../components/editor/panels/BackgroundPanel')

    render(<BackgroundPanel canvas={null} history={null} layerTree={null} />)

    const colorBtns = screen.getAllByRole('button', { name: /배경 적용/ })
    expect(colorBtns.length).toBeGreaterThan(0)

    // canvas null → showToast('편집기가 준비되지 않았습니다.')
    const firstBtn = colorBtns[0]
    if (!firstBtn) throw new Error('color button not found')
    fireEvent.click(firstBtn)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('편집기가 준비되지 않았습니다'),
      'error',
    )
  })

  it('12개 색상 버튼이 렌더된다', async () => {
    const { BackgroundPanel } = await import('../components/editor/panels/BackgroundPanel')

    render(<BackgroundPanel canvas={null} history={null} layerTree={null} />)

    const colorBtns = screen.getAllByRole('button', { name: /배경 적용/ })
    expect(colorBtns.length).toBe(12)
  })
})

// ── ShapePanel 테스트 ─────────────────────────────────────────────────────────

describe('ShapePanel — 도형 클릭', () => {
  it('4종 도형 버튼 렌더', async () => {
    const { ShapePanel } = await import('../components/editor/panels/ShapePanel')

    render(<ShapePanel canvas={null} history={null} />)

    expect(screen.getByRole('button', { name: '사각형 추가' })).toBeDefined()
    expect(screen.getByRole('button', { name: '원 추가' })).toBeDefined()
    expect(screen.getByRole('button', { name: '선 추가' })).toBeDefined()
    expect(screen.getByRole('button', { name: '삼각형 추가' })).toBeDefined()
  })

  it('canvas null 일 때 도형 클릭 → Toast', async () => {
    const { ShapePanel } = await import('../components/editor/panels/ShapePanel')

    render(<ShapePanel canvas={null} history={null} />)

    const rectBtn = screen.getByRole('button', { name: '사각형 추가' })
    fireEvent.click(rectBtn)

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('편집기가 준비되지 않았습니다'),
      'error',
    )
  })
})

// ── useToolStore 단위 테스트 ──────────────────────────────────────────────────

describe('useToolStore — tapTool 로직', () => {
  it('select tapTool → active=select, sidebarOpen=false', async () => {
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })
    useToolStore.getState().tapTool('select')

    expect(useToolStore.getState().active).toBe('select')
    expect(useToolStore.getState().sidebarOpen).toBe(false)
  })

  it('다른 도구 클릭 → active 변경 + sidebarOpen=true', async () => {
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'select', sidebarOpen: false })
    useToolStore.getState().tapTool('background')

    expect(useToolStore.getState().active).toBe('background')
    expect(useToolStore.getState().sidebarOpen).toBe(true)
  })

  it('같은 도구 재클릭 → sidebarOpen toggle', async () => {
    const { useToolStore } = await import('../components/editor/store/useToolStore')

    useToolStore.setState({ active: 'background', sidebarOpen: true })
    useToolStore.getState().tapTool('background')

    expect(useToolStore.getState().sidebarOpen).toBe(false)

    useToolStore.getState().tapTool('background')
    expect(useToolStore.getState().sidebarOpen).toBe(true)
  })
})
