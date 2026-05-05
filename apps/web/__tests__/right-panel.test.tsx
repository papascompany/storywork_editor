/**
 * right-panel.test.tsx — M1-08d RightPanel + ControlBar + LayerPanel 통합 테스트
 *
 * 검증 항목:
 * 1. 탭 전환 (Properties/Layers)
 * 2. 객체 선택 → Properties 탭 자동 전환
 * 3. 선택 해제 시 빈 상태
 * 4. Position/Size 입력 → 캔버스 객체 좌표 변경 (TransformObjectCommand)
 * 5. Background 객체 선택 후 Fill 색 변경 → fabric fill 변경
 * 6. Lock 토글 → LockCommand + history push
 * 7. LayerPanel 행 클릭 → setActiveObject 호출
 * 8. LayerPanel 행 더블클릭 → 인라인 편집 input 활성
 * 9. LayerPanel 빈 상태 텍스트 렌더
 * 10. Delete 버튼 → RemoveObjectCommand push
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── 공통 모킹 ────────────────────────────────────────────────────────────────

// @storywork/ui 모킹
vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactElement }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    showToast: vi.fn(),
    cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
    // Tabs — 실제 Radix Tabs 를 직접 사용 (단순 구현)
    Tabs: ({
      children,
      value,
      defaultValue,
      onValueChange,
    }: {
      children: React.ReactNode
      value?: string
      defaultValue?: string
      onValueChange?: (v: string) => void
    }) => {
      const [active, setActive] = React.useState(value ?? defaultValue ?? '')
      // 제어/비제어 통합
      const currentTab = value ?? active
      return (
        <div data-testid="tabs" data-active={currentTab}>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child
            // @ts-expect-error — children 타입 조작
            return React.cloneElement(child, {
              _activeTab: currentTab,
              _onTabChange: (v: string) => {
                setActive(v)
                onValueChange?.(v)
              },
            })
          })}
        </div>
      )
    },
    TabsList: ({
      children,
      _activeTab,
      _onTabChange,
    }: {
      children: React.ReactNode
      _activeTab?: string
      _onTabChange?: (v: string) => void
    }) => (
      <div role="tablist">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          // @ts-expect-error — children 타입 조작
          return React.cloneElement(child, { _activeTab, _onTabChange })
        })}
      </div>
    ),
    TabsTrigger: ({
      children,
      value,
      _activeTab,
      _onTabChange,
    }: {
      children: React.ReactNode
      value: string
      _activeTab?: string
      _onTabChange?: (v: string) => void
    }) => (
      <button
        role="tab"
        aria-selected={_activeTab === value}
        onClick={() => _onTabChange?.(value)}
        data-state={_activeTab === value ? 'active' : 'inactive'}
      >
        {children}
      </button>
    ),
    TabsContent: ({
      children,
      value,
      _activeTab,
      className,
    }: {
      children: React.ReactNode
      value: string
      _activeTab?: string
      className?: string
    }) =>
      _activeTab === value ? (
        <div role="tabpanel" className={className}>
          {children}
        </div>
      ) : null,
    // ColorPicker 단순 mock
    ColorPicker: ({ value, onChange }: { value?: string; onChange?: (hex: string) => void }) => (
      <div data-testid="color-picker">
        <button onClick={() => onChange?.('#ff0000')} aria-label="빨강 색 선택">
          빨강
        </button>
        <span data-testid="current-color">{value}</span>
      </div>
    ),
    // Slider 단순 mock
    Slider: ({
      label,
      value,
      onValueChange,
      onValueCommit,
    }: {
      label?: string
      value?: number
      onValueChange?: (v: number) => void
      onValueCommit?: (v: number) => void
    }) => (
      <div data-testid={`slider-${label?.replace(/\s/g, '-') ?? 'unknown'}`}>
        <input
          type="range"
          aria-label={label}
          value={value ?? 0}
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          onMouseUp={(e) => onValueCommit?.(Number((e.target as HTMLInputElement).value))}
        />
      </div>
    ),
    // DropdownMenu mock
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
      <>{children}</>
    ),
    DropdownMenuContent: ({
      children,
    }: {
      children: React.ReactNode
      side?: string
      align?: string
      className?: string
    }) => <div role="menu">{children}</div>,
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode
      onSelect?: () => void
      disabled?: boolean
      className?: string
    }) => (
      <button role="menuitem" onClick={onSelect} disabled={disabled}>
        {children}
      </button>
    ),
    DropdownMenuSeparator: () => <hr />,
    Input: ({
      className,
      onChange,
      onBlur,
      onKeyDown,
      value,
      defaultValue,
      ...rest
    }: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input
        {...rest}
        className={className}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    ),
  }
})

// fabric 모킹
const mockSetActiveObject = vi.fn()
const mockRequestRenderAll = vi.fn()
const mockDiscardActiveObject = vi.fn()

vi.mock('fabric', async () => {
  class FabricObjectMock {
    left = 0
    top = 0
    width = 100
    height = 100
    scaleX = 1
    scaleY = 1
    angle = 0
    flipX = false
    flipY = false
    opacity = 1
    fill = '#ffffff'
    stroke = ''
    strokeWidth = 0
    data: Record<string, unknown> = {}
    constructor(opts?: Record<string, unknown>) {
      Object.assign(this, opts ?? {})
    }
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
    setCoords() {}
    on() {}
    off() {}
  }
  return {
    Rect: FabricObjectMock,
    Circle: FabricObjectMock,
    Line: FabricObjectMock,
    Triangle: FabricObjectMock,
    FabricImage: { fromURL: vi.fn() },
  }
})

// @storywork/editor-history 모킹
const mockHistoryPush = vi.fn()

vi.mock('@storywork/editor-history', async () => ({
  TransformObjectCommand: vi
    .fn()
    .mockImplementation((opts) => ({ name: 'canvas:transform', ...opts })),
  LockCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:lock', ...opts })),
  HiddenCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:hidden', ...opts })),
  RemoveObjectCommand: vi.fn().mockImplementation((opts) => ({ name: 'canvas:remove', ...opts })),
  RenameLayerCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:rename', ...opts })),
  ZOrderCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:zorder', ...opts })),
  snapshotFromFabricObject: vi.fn().mockReturnValue({
    left: 0,
    top: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
  }),
  collectLockPrevStates: vi.fn().mockReturnValue(new Map()),
  collectHiddenPrevStates: vi.fn().mockReturnValue(new Map()),
}))

// canvas mock
function makeCanvasMock(kind = 'background') {
  const obj = {
    left: 10,
    top: 20,
    width: 100,
    height: 80,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    fill: '#aabbcc',
    stroke: '#000000',
    strokeWidth: 2,
    data: { kind, id: 'obj-1' },
    set: vi.fn(),
    setCoords: vi.fn(),
  }
  return {
    getObject: vi.fn().mockReturnValue(obj),
    getObjectData: vi.fn().mockReturnValue({ kind, id: 'obj-1' }),
    mmToPx: vi.fn((v: number) => v * 4),
    pxToMm: vi.fn((v: number) => v / 4),
    _fabricCanvas: {
      setActiveObject: mockSetActiveObject,
      requestRenderAll: mockRequestRenderAll,
      discardActiveObject: mockDiscardActiveObject,
      fire: vi.fn(),
    },
    removeObject: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  }
}

// layerTree mock
function makeLayerTreeMock(
  nodes: Array<{
    id: string
    kind: string
    name?: string
    locked?: boolean
    hidden?: boolean
  }> = [],
) {
  const nodeMap = new Map(
    nodes.map((n) => [
      n.id,
      {
        ...n,
        parentId: null,
        childrenIds: [],
        locked: n.locked ?? false,
        hidden: n.hidden ?? false,
      },
    ]),
  )

  const listeners: Map<string, Set<() => void>> = new Map()

  return {
    getRootNodes: vi.fn().mockReturnValue([...nodeMap.values()]),
    getNode: vi.fn((id: string) => nodeMap.get(id)),
    getDescendants: vi.fn().mockReturnValue([]),
    setLock: vi.fn(),
    setHidden: vi.fn(),
    rename: vi.fn(),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    moveTo: vi.fn(),
    on: vi.fn().mockImplementation((event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)?.add(cb)
      return () => listeners.get(event)?.delete(cb)
    }),
  }
}

function makeHistoryMock() {
  return { push: mockHistoryPush }
}

// ── 기본 Props ────────────────────────────────────────────────────────────────

const defaultProps = {
  props: null,
  canvas: null,
  layerTree: null,
  history: null,
  selectedIds: [],
}

// ── 테스트 ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockHistoryPush.mockClear()
  mockSetActiveObject.mockClear()
  mockRequestRenderAll.mockClear()
  mockDiscardActiveObject.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ── RightPanel 기본 ───────────────────────────────────────────────────────────

describe('RightPanel — 기본 렌더', () => {
  it('data-testid=right-panel 이 렌더된다', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    expect(screen.getByTestId('right-panel')).toBeInTheDocument()
  })

  it('탭 두 개 (속성/레이어) 가 렌더된다', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    expect(screen.getByRole('tab', { name: /속성/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /레이어/ })).toBeInTheDocument()
  })

  it('초기 상태는 Properties 탭 활성', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    const propTab = screen.getByRole('tab', { name: /속성/ })
    expect(propTab).toHaveAttribute('aria-selected', 'true')
  })

  it('선택 없을 때 빈 상태 메시지 표시', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    expect(screen.getByText('객체를 선택하면 속성이 여기에 표시됩니다')).toBeInTheDocument()
  })
})

// ── 탭 전환 ──────────────────────────────────────────────────────────────────

describe('RightPanel — 탭 전환', () => {
  it('레이어 탭 클릭 → Layers 콘텐츠 표시', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    const layersTab = screen.getByRole('tab', { name: /레이어/ })
    fireEvent.click(layersTab)
    expect(layersTab).toHaveAttribute('aria-selected', 'true')
  })

  it('속성 탭 클릭 → Properties 콘텐츠 표시', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')
    render(<RightPanel {...defaultProps} />)
    const layersTab = screen.getByRole('tab', { name: /레이어/ })
    fireEvent.click(layersTab)
    const propsTab = screen.getByRole('tab', { name: /속성/ })
    fireEvent.click(propsTab)
    expect(propsTab).toHaveAttribute('aria-selected', 'true')
  })
})

// ── 객체 선택 자동 탭 전환 ───────────────────────────────────────────────────

describe('RightPanel — 객체 선택 자동 탭 전환', () => {
  it('selectedIds 변경 → Properties 탭으로 자동 전환', async () => {
    const { RightPanel } = await import('../components/editor/RightPanel')

    function Wrapper() {
      const [selectedIds, setSelectedIds] = React.useState<string[]>([])
      return (
        <div>
          <button onClick={() => setSelectedIds(['obj-1'])}>Select</button>
          <RightPanel {...defaultProps} selectedIds={selectedIds} />
        </div>
      )
    }

    render(<Wrapper />)

    // 먼저 레이어 탭으로 이동
    const layersTab = screen.getByRole('tab', { name: /레이어/ })
    fireEvent.click(layersTab)
    expect(layersTab).toHaveAttribute('aria-selected', 'true')

    // 객체 선택 → 자동으로 Properties 탭으로 이동
    const selectBtn = screen.getByRole('button', { name: 'Select' })
    fireEvent.click(selectBtn)

    const propsTab = screen.getByRole('tab', { name: /속성/ })
    expect(propsTab).toHaveAttribute('aria-selected', 'true')
  })
})

// ── ControlBar — 공통 섹션 ────────────────────────────────────────────────────

describe('ControlBar — 위치/크기 섹션', () => {
  it('X/Y/너비/높이 입력이 렌더된다', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 10, y: 20, width: 50, height: 40, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    expect(screen.getByLabelText('X 위치 (mm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Y 위치 (mm)')).toBeInTheDocument()
    expect(screen.getByLabelText('너비 (mm)')).toBeInTheDocument()
    expect(screen.getByLabelText('높이 (mm)')).toBeInTheDocument()
  })

  it('X 입력 후 Enter → TransformObjectCommand push', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 10, y: 20, width: 50, height: 40, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    const xInput = screen.getByLabelText('X 위치 (mm)')
    fireEvent.change(xInput, { target: { value: '30' } })
    fireEvent.keyDown(xInput, { key: 'Enter' })

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
  })

  it('Esc 키로 원래값 복원', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 10, y: 20, width: 50, height: 40, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    const xInput = screen.getByLabelText('X 위치 (mm)') as HTMLInputElement
    fireEvent.change(xInput, { target: { value: '999' } })
    fireEvent.keyDown(xInput, { key: 'Escape' })

    // Esc 후 history push 없어야 함
    expect(mockHistoryPush).not.toHaveBeenCalled()
  })
})

// ── ControlBar — 상태 섹션 ────────────────────────────────────────────────────

describe('ControlBar — 상태 섹션 (Lock/Hidden/Delete)', () => {
  it('Lock 버튼이 렌더된다', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const layerTree = makeLayerTreeMock([{ id: 'obj-1', kind: 'background' }])
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={layerTree as never}
        history={history as never}
      />,
    )

    expect(screen.getByRole('button', { name: '잠금' })).toBeInTheDocument()
  })

  it('Lock 토글 → LockCommand push', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const layerTree = makeLayerTreeMock([{ id: 'obj-1', kind: 'background' }])
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={layerTree as never}
        history={history as never}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '잠금' }))
    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
  })

  it('Delete 버튼 클릭 → RemoveObjectCommand push', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()
    const layerTree = makeLayerTreeMock([{ id: 'obj-1', kind: 'background' }])
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={layerTree as never}
        history={history as never}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockDiscardActiveObject).toHaveBeenCalledTimes(1)
  })
})

// ── ControlBar — Background Fill ─────────────────────────────────────────────

describe('ControlBar — Background Fill', () => {
  it('background 종류일 때 ColorPicker 렌더', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock('background')
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    expect(screen.getByTestId('color-picker')).toBeInTheDocument()
  })

  it('Fill 색 변경 → TransformObjectCommand push', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock('background')
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    fireEvent.click(screen.getByLabelText('빨강 색 선택'))
    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
  })

  it('pose 종류일 때 M2 placeholder 렌더', async () => {
    const { ControlBar } = await import('../components/editor/ControlBar')
    const canvas = makeCanvasMock('pose')
    const history = makeHistoryMock()
    const props = { id: 'obj-1', x: 0, y: 0, width: 100, height: 100, angle: 0 }

    render(
      <ControlBar
        props={props}
        canvas={canvas as never}
        layerTree={null}
        history={history as never}
      />,
    )

    expect(screen.getByText(/M2 에서 활성화 예정/)).toBeInTheDocument()
  })
})

// ── LayerPanel 테스트 ─────────────────────────────────────────────────────────

describe('LayerPanel — 기본 렌더', () => {
  it('빈 상태 메시지 렌더', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    render(<LayerPanel layerTree={null} canvas={null} history={null} selectedIds={[]} />)
    expect(screen.getByText('레이어가 없습니다')).toBeInTheDocument()
  })

  it('레이어 노드 행 렌더', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const layerTree = makeLayerTreeMock([{ id: 'node-1', kind: 'background', name: '배경 레이어' }])

    render(
      <LayerPanel layerTree={layerTree as never} canvas={null} history={null} selectedIds={[]} />,
    )

    expect(screen.getByText('배경 레이어')).toBeInTheDocument()
  })

  it('행 클릭 → setActiveObject 호출', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const canvas = makeCanvasMock('background')
    const layerTree = makeLayerTreeMock([{ id: 'node-1', kind: 'background' }])

    render(
      <LayerPanel
        layerTree={layerTree as never}
        canvas={canvas as never}
        history={null}
        selectedIds={[]}
      />,
    )

    const row = screen.getByTestId('layer-row-node-1')
    fireEvent.click(row)

    expect(mockSetActiveObject).toHaveBeenCalledTimes(1)
    expect(mockRequestRenderAll).toHaveBeenCalledTimes(1)
  })

  it('행 더블클릭 → 인라인 편집 input 활성', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const layerTree = makeLayerTreeMock([{ id: 'node-1', kind: 'background', name: '배경' }])

    render(
      <LayerPanel layerTree={layerTree as never} canvas={null} history={null} selectedIds={[]} />,
    )

    const nameSpan = screen.getByText('배경')
    fireEvent.dblClick(nameSpan)

    expect(screen.getByRole('textbox', { name: '레이어 이름 편집' })).toBeInTheDocument()
  })

  it('선택된 행 — aria-selected=true', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const layerTree = makeLayerTreeMock([{ id: 'node-1', kind: 'background' }])

    render(
      <LayerPanel
        layerTree={layerTree as never}
        canvas={null}
        history={null}
        selectedIds={['node-1']}
      />,
    )

    const row = screen.getByTestId('layer-row-node-1')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  it('잠금 버튼 클릭 → LockCommand push', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const layerTree = makeLayerTreeMock([{ id: 'node-1', kind: 'background' }])
    const history = makeHistoryMock()

    render(
      <LayerPanel
        layerTree={layerTree as never}
        canvas={null}
        history={history as never}
        selectedIds={['node-1']}
      />,
    )

    const lockBtn = screen.getByRole('button', { name: '잠금' })
    fireEvent.click(lockBtn)

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
  })

  it('레이어 개수 표시', async () => {
    const { LayerPanel } = await import('../components/editor/LayerPanel')
    const layerTree = makeLayerTreeMock([
      { id: 'node-1', kind: 'background' },
      { id: 'node-2', kind: 'pose' },
    ])

    render(
      <LayerPanel layerTree={layerTree as never} canvas={null} history={null} selectedIds={[]} />,
    )

    expect(screen.getByText('2개')).toBeInTheDocument()
  })
})
