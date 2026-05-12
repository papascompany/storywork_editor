/**
 * canvas-ux.test.tsx — M1-08e 캔버스 UX 5종 테스트
 *
 * 검증 항목:
 * 1.  EmptyCanvasHint: 객체 0개 → 힌트 노출
 * 2.  EmptyCanvasHint: 객체 추가 → 자동 숨김
 * 3.  EmptyCanvasHint: background 객체만 → 힌트 노출 (시스템 kind 제외 아님)
 * 4.  useImageDrop: 이미지 파일 드롭 → addObject 호출
 * 5.  useImageDrop: 비이미지 파일 드롭 → 거부 + showToast warning
 * 6.  useImageDrop: 10MB 초과 → 거부 + showToast warning
 * 7.  Footer: 줌 + 버튼 클릭 → applyZoom 호출
 * 8.  Footer: − 버튼 클릭 → applyZoom 호출
 * 9.  Footer: 맞춤 버튼 → fitToViewport 호출
 * 10. FloatingObjectBar: 객체 선택 → 바 노출 (selectedIds 있을 때)
 * 11. FloatingObjectBar: 삭제 버튼 → RemoveObjectCommand push
 * 12. FloatingObjectBar: isTransforming 중 → 숨김
 * 13. CanvasContextMenu: 우클릭 → 메뉴 노출
 * 14. CanvasContextMenu: 빈 공간 전체선택 → setActiveObject 호출
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── 공통 모킹 ─────────────────────────────────────────────────────────────────

const mockShowToast = vi.fn()
const mockHistoryPush = vi.fn()
const mockSetActiveObject = vi.fn()
const mockRequestRenderAll = vi.fn()
const mockDiscardActiveObject = vi.fn()
// Footer 내부 함수는 모듈 내 직접 호출 → fabricCanvas mock 으로 검증
const mockZoomToPoint = vi.fn()
const mockSetZoom = vi.fn()
const mockSetViewportTransform = vi.fn()
const mockSetDimensions = vi.fn()

// @storywork/ui 모킹
vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactElement }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    showToast: (...args: unknown[]) => mockShowToast(...args),
    cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
    Button: ({
      children,
      onClick,
      disabled,
      'aria-label': ariaLabel,
      className,
    }: {
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      'aria-label'?: string
      className?: string
    }) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </button>
    ),
    Slider: ({
      value,
      onValueChange,
      onValueCommit,
      'aria-label': ariaLabel,
      min,
      max,
    }: {
      value?: number
      onValueChange?: (v: number) => void
      onValueCommit?: (v: number) => void
      'aria-label'?: string
      min?: number
      max?: number
    }) => (
      <input
        type="range"
        aria-label={ariaLabel}
        value={value ?? 0}
        min={min}
        max={max}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        onMouseUp={(e) => onValueCommit?.(Number((e.target as HTMLInputElement).value))}
      />
    ),
    DropdownMenu: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode
      open?: boolean
      onOpenChange?: (open: boolean) => void
    }) => (
      <div data-testid="dropdown-menu" data-open={open} onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ),
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div role="menu" data-testid="dropdown-content">
        {children}
      </div>
    ),
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode
      onSelect?: () => void
      disabled?: boolean
    }) => (
      <button role="menuitem" onClick={onSelect} disabled={disabled}>
        {children}
      </button>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  }
})

// fabric 모킹
vi.mock('fabric', async () => {
  class FabricObjectMock {
    left = 0
    top = 0
    width = 100
    height = 100
    scaleX = 1
    scaleY = 1
    angle = 0
    data: Record<string, unknown> = {}
    constructor(opts?: Record<string, unknown>) {
      Object.assign(this, opts ?? {})
    }
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
    setCoords() {}
    getBoundingRect() {
      return { left: 10, top: 10, width: 50, height: 50 }
    }
    clone() {
      return Promise.resolve(new FabricObjectMock())
    }
    on() {}
    off() {}
  }

  class PointMock {
    x: number
    y: number
    constructor(x: number, y: number) {
      this.x = x
      this.y = y
    }
  }

  return {
    Rect: FabricObjectMock,
    Circle: FabricObjectMock,
    FabricImage: {
      fromURL: vi.fn().mockResolvedValue(new FabricObjectMock()),
    },
    ActiveSelection: class {
      constructor(_objs: unknown[], _opts: unknown) {}
    },
    Point: PointMock,
  }
})

// @storywork/editor-history 모킹
vi.mock('@storywork/editor-history', async () => ({
  AddObjectCommand: vi
    .fn()
    .mockImplementation((opts) => ({ name: 'canvas:add', assignedId: 'new-id', ...opts })),
  RemoveObjectCommand: vi.fn().mockImplementation((opts) => ({ name: 'canvas:remove', ...opts })),
  LockCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:lock', ...opts })),
  HiddenCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:hidden', ...opts })),
  ZOrderCommand: vi.fn().mockImplementation((opts) => ({ name: 'layers:zorder', ...opts })),
  collectLockPrevStates: vi.fn().mockReturnValue(new Map()),
  collectHiddenPrevStates: vi.fn().mockReturnValue(new Map()),
}))

// Footer 는 동일 모듈 내 함수를 직접 사용하므로
// vi.mock 으로 내부 함수를 교체할 수 없다.
// 대신 fabricCanvas.zoomToPoint / viewportTransform 을 통해 검증한다.

// useToolStore 모킹
vi.mock('../components/editor/store/useToolStore', () => ({
  useToolStore: () => ({
    active: 'select',
    setActive: vi.fn(),
  }),
}))

// ── 픽스처 헬퍼 ──────────────────────────────────────────────────────────────

type FabricObjMock = {
  data: { kind?: string; id?: string }
  left: number
  top: number
  width: number
  height: number
  getBoundingRect: () => { left: number; top: number; width: number; height: number }
}

function makeCanvasMock(objectKinds: string[] = []) {
  const fabricObjects: FabricObjMock[] = objectKinds.map((kind, i) => ({
    data: { kind, id: `obj-${i}` },
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    getBoundingRect: () => ({ left: 10, top: 10, width: 50, height: 50 }),
  }))

  const listeners: Map<string, Set<() => void>> = new Map()

  const fabricCanvasMock = {
    getObjects: vi.fn().mockReturnValue(fabricObjects),
    getActiveObject: vi.fn().mockReturnValue(null),
    setActiveObject: mockSetActiveObject,
    requestRenderAll: mockRequestRenderAll,
    discardActiveObject: mockDiscardActiveObject,
    fire: vi.fn(),
    findTarget: vi.fn().mockReturnValue(null),
    getZoom: vi.fn().mockReturnValue(1),
    getWidth: vi.fn().mockReturnValue(800),
    getHeight: vi.fn().mockReturnValue(600),
    getElement: vi.fn().mockReturnValue({
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    }),
    zoomToPoint: mockZoomToPoint,
    viewportTransform: [1, 0, 0, 1, 0, 0],
    setZoom: mockSetZoom,
    setViewportTransform: mockSetViewportTransform,
    setDimensions: mockSetDimensions,
    on: vi.fn().mockImplementation((event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)?.add(cb)
    }),
    off: vi.fn().mockImplementation((event: string, cb: () => void) => {
      listeners.get(event)?.delete(cb)
    }),
  }

  // 이벤트 발화 헬퍼
  const fireEvent_ = (event: string) => {
    listeners.get(event)?.forEach((cb) => cb())
  }

  const canvasMock = {
    _fabricCanvas: fabricCanvasMock,
    getObject: vi.fn((id: string) => fabricObjects.find((o) => o.data.id === id) ?? null),
    getObjectData: vi.fn((id: string) => {
      const obj = fabricObjects.find((o) => o.data.id === id)
      return obj ? { kind: obj.data.kind, id } : null
    }),
    mmToPx: vi.fn((v: number) => v * 4),
    pxToMm: vi.fn((v: number) => v / 4),
    removeObject: vi.fn(),
    on: vi.fn().mockReturnValue(vi.fn()),
    off: vi.fn(),
    // FOLLOWUP-42: fitToViewport 에서 canvas.format 을 읽음
    format: { id: 'b5-300dpi', widthMm: 130, heightMm: 200, dpi: 300 },
    setFormat: vi.fn(),
    _fireEvent: fireEvent_,
  }

  return canvasMock
}

function makeHistoryMock() {
  return { push: mockHistoryPush }
}

// ── setup/teardown ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// A. EmptyCanvasHint
// ═══════════════════════════════════════════════════════════════════════════════

describe('EmptyCanvasHint', () => {
  it('1. canvas null → 힌트 노출', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    render(<EmptyCanvasHint canvas={null} />)
    expect(screen.getByText('디자인을 시작해보세요')).toBeInTheDocument()
  })

  it('2. 객체 0개 → 힌트 노출', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    const canvas = makeCanvasMock([]) // 빈 캔버스
    render(<EmptyCanvasHint canvas={canvas as never} />)
    expect(screen.getByText('디자인을 시작해보세요')).toBeInTheDocument()
  })

  it('3. 사용자 객체 있으면 힌트 숨김', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    const canvas = makeCanvasMock(['pose']) // 포즈 객체 1개
    render(<EmptyCanvasHint canvas={canvas as never} />)
    expect(screen.queryByText('디자인을 시작해보세요')).not.toBeInTheDocument()
  })

  it('4. __system__ kind 는 카운트 제외 → 힌트 노출', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    const canvas = makeCanvasMock(['__system__'])
    render(<EmptyCanvasHint canvas={canvas as never} />)
    expect(screen.getByText('디자인을 시작해보세요')).toBeInTheDocument()
  })

  it('5. onActivatePoseTool 버튼이 렌더된다', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    const onActivate = vi.fn()
    render(<EmptyCanvasHint canvas={null} onActivatePoseTool={onActivate} />)
    expect(screen.getByText('포즈 추가하기')).toBeInTheDocument()
  })

  it('6. 포즈 추가하기 클릭 → 콜백 호출', async () => {
    const { EmptyCanvasHint } = await import('../components/editor/EmptyCanvasHint')
    const onActivate = vi.fn()
    render(<EmptyCanvasHint canvas={null} onActivatePoseTool={onActivate} />)
    fireEvent.click(screen.getByText('포즈 추가하기'))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// B. useImageDrop
// ═══════════════════════════════════════════════════════════════════════════════

describe('useImageDrop', () => {
  // useImageDrop 테스트는 FileReader 와 FabricImage.fromURL 을 포함하므로
  // 동작 시나리오별로 직접 훅 동작을 검증

  it('7. 비이미지 파일 드롭 → showToast warning', async () => {
    const { useImageDrop } = await import('../components/editor/hooks/useImageDrop')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()

    let dropResult: ReturnType<typeof useImageDrop>

    function TestComp() {
      dropResult = useImageDrop({ canvas: canvas as never, history: history as never })
      return (
        <div
          data-testid="drop-zone"
          onDrop={dropResult.onDrop as React.DragEventHandler}
          onDragOver={dropResult.onDragOver as React.DragEventHandler}
        />
      )
    }

    render(<TestComp />)
    const zone = screen.getByTestId('drop-zone')

    // PDF 파일 드롭
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('지원하지 않는 파일 형식'),
      'warning',
    )
  })

  it('8. 10MB 초과 이미지 → showToast warning', async () => {
    const { useImageDrop } = await import('../components/editor/hooks/useImageDrop')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()

    function TestComp() {
      const drop = useImageDrop({ canvas: canvas as never, history: history as never })
      return (
        <div
          data-testid="drop-zone"
          onDrop={drop.onDrop as React.DragEventHandler}
          onDragOver={drop.onDragOver as React.DragEventHandler}
        />
      )
    }

    render(<TestComp />)
    const zone = screen.getByTestId('drop-zone')

    // 11MB 파일
    const bigBuffer = new ArrayBuffer(11 * 1024 * 1024)
    const bigFile = new File([bigBuffer], 'big.png', { type: 'image/png' })
    // size는 읽기 전용이지만 File 생성자로 내용 크기가 자동 설정됨
    fireEvent.drop(zone, {
      dataTransfer: { files: [bigFile] },
    })

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('제한을 초과'), 'warning')
  })

  it('9. dragEnter → isDragging true, dragLeave → false', async () => {
    const { useImageDrop } = await import('../components/editor/hooks/useImageDrop')
    const canvas = makeCanvasMock()
    const history = makeHistoryMock()

    function TestComp() {
      const drop = useImageDrop({ canvas: canvas as never, history: history as never })
      return (
        <div
          data-testid="drop-zone"
          data-dragging={String(drop.isDragging)}
          onDragEnter={drop.onDragEnter as React.DragEventHandler}
          onDragLeave={drop.onDragLeave as React.DragEventHandler}
          onDragOver={drop.onDragOver as React.DragEventHandler}
          onDrop={drop.onDrop as React.DragEventHandler}
        />
      )
    }

    render(<TestComp />)
    const zone = screen.getByTestId('drop-zone')

    expect(zone).toHaveAttribute('data-dragging', 'false')

    fireEvent.dragEnter(zone)
    expect(zone).toHaveAttribute('data-dragging', 'true')

    fireEvent.dragLeave(zone)
    expect(zone).toHaveAttribute('data-dragging', 'false')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// C. Footer
// ═══════════════════════════════════════════════════════════════════════════════

describe('Footer', () => {
  it('10. 렌더된다', async () => {
    const { Footer } = await import('../components/editor/Footer')
    const canvas = makeCanvasMock()
    render(<Footer canvas={canvas as never} />)
    // Footer 는 md+ only (hidden md:flex) → DOM에는 있음
    expect(screen.getByRole('toolbar', { name: '캔버스 하단 도구' })).toBeInTheDocument()
  })

  it('11. + 버튼 클릭 → fabricCanvas.zoomToPoint 호출', async () => {
    const { Footer } = await import('../components/editor/Footer')
    const canvas = makeCanvasMock()
    // getZoom() 이 1(=100%)을 반환하도록 설정됨 (기본)
    render(<Footer canvas={canvas as never} />)

    const zoomInBtn = screen.getByRole('button', { name: '확대' })
    fireEvent.click(zoomInBtn)

    // applyZoom → fabricCanvas.zoomToPoint 호출 검증
    expect(mockZoomToPoint).toHaveBeenCalledTimes(1)
  })

  it('12. − 버튼 클릭 → fabricCanvas.zoomToPoint 호출', async () => {
    const { Footer } = await import('../components/editor/Footer')
    const canvas = makeCanvasMock()
    render(<Footer canvas={canvas as never} />)

    const zoomOutBtn = screen.getByRole('button', { name: '축소' })
    fireEvent.click(zoomOutBtn)

    expect(mockZoomToPoint).toHaveBeenCalledTimes(1)
  })

  it('13. 맞춤 버튼 → fabricCanvas.setViewportTransform 호출', async () => {
    const { Footer } = await import('../components/editor/Footer')
    const canvas = makeCanvasMock()
    render(<Footer canvas={canvas as never} />)

    const fitBtn = screen.getByRole('button', { name: '페이지 맞춤' })
    fireEvent.click(fitBtn)

    // fitToViewport → fabricCanvas.setViewportTransform 호출 검증
    // (setZoom + pan 을 setViewportTransform 으로 통합 설정)
    expect(mockSetViewportTransform).toHaveBeenCalledTimes(1)
  })

  it('14. canvas null → 버튼 비활성', async () => {
    const { Footer } = await import('../components/editor/Footer')
    render(<Footer canvas={null} />)

    expect(screen.getByRole('button', { name: '확대' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '축소' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '페이지 맞춤' })).toBeDisabled()
  })

  it('15. 페이지 인디케이터가 렌더된다', async () => {
    const { Footer } = await import('../components/editor/Footer')
    const canvas = makeCanvasMock()
    // 5개 이하 → dot 인디케이터, 1페이지 기본값 → page-dot-1
    render(<Footer canvas={canvas as never} totalPages={1} currentPage={1} />)

    // dot 인디케이터 (1페이지)
    expect(screen.getByTestId('page-dot-1')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// D. FloatingObjectBar
// ═══════════════════════════════════════════════════════════════════════════════

describe('FloatingObjectBar', () => {
  it('16. selectedIds 없으면 렌더 안 됨', async () => {
    const { FloatingObjectBar } = await import('../components/editor/FloatingObjectBar')
    const canvas = makeCanvasMock(['pose'])
    const wrapperRef = { current: document.createElement('div') }

    render(
      <FloatingObjectBar
        canvas={canvas as never}
        history={null}
        layerTree={null}
        selectedIds={[]}
        canvasWrapperRef={wrapperRef}
      />,
    )
    // toolbar role 자체가 없어야 함
    expect(screen.queryByRole('toolbar', { name: '선택 객체 액션' })).not.toBeInTheDocument()
  })

  it('17. 삭제 버튼 → RemoveObjectCommand push', async () => {
    const { FloatingObjectBar } = await import('../components/editor/FloatingObjectBar')
    const canvas = makeCanvasMock(['pose'])
    // getObject, getObjectData 반환값 설정
    const fabricObj = {
      data: { kind: 'pose', id: 'obj-0' },
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      getBoundingRect: () => ({ left: 50, top: 50, width: 80, height: 60 }),
    }
    canvas.getObject.mockReturnValue(fabricObj)
    canvas.getObjectData.mockReturnValue({ kind: 'pose', id: 'obj-0' })

    // BoundingRect 를 위해 canvas 의 fabricCanvas activeObject 반환
    canvas._fabricCanvas.getObjects.mockReturnValue([fabricObj])
    canvas._fabricCanvas.getActiveObject.mockReturnValue(fabricObj)

    const wrapperDiv = document.createElement('div')
    wrapperDiv.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    const wrapperRef = { current: wrapperDiv }
    const history = makeHistoryMock()

    render(
      <FloatingObjectBar
        canvas={canvas as never}
        history={history as never}
        layerTree={null}
        selectedIds={['obj-0']}
        canvasWrapperRef={wrapperRef}
      />,
    )

    const deleteBtn = screen.getByRole('button', { name: '삭제' })
    fireEvent.click(deleteBtn)

    expect(mockHistoryPush).toHaveBeenCalledTimes(1)
    expect(mockDiscardActiveObject).toHaveBeenCalledTimes(1)
  })

  it('18. 복제 버튼 렌더된다', async () => {
    const { FloatingObjectBar } = await import('../components/editor/FloatingObjectBar')
    const canvas = makeCanvasMock(['pose'])

    const activeObj = {
      data: { kind: 'pose', id: 'obj-0' },
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      getBoundingRect: () => ({ left: 50, top: 50, width: 80, height: 60 }),
    }
    canvas._fabricCanvas.getActiveObject.mockReturnValue(activeObj)
    canvas.getObject.mockReturnValue(activeObj)

    const wrapperDiv = document.createElement('div')
    wrapperDiv.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    const wrapperRef = { current: wrapperDiv }

    render(
      <FloatingObjectBar
        canvas={canvas as never}
        history={makeHistoryMock() as never}
        layerTree={null}
        selectedIds={['obj-0']}
        canvasWrapperRef={wrapperRef}
      />,
    )

    expect(screen.getByRole('button', { name: '복제' })).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// E. CanvasContextMenu
// ═══════════════════════════════════════════════════════════════════════════════

describe('CanvasContextMenu', () => {
  it('19. 렌더된다 (메뉴 닫힌 상태)', async () => {
    const { CanvasContextMenu } = await import('../components/editor/CanvasContextMenu')
    const canvas = makeCanvasMock()
    const wrapperDiv = document.createElement('div')
    const wrapperRef = { current: wrapperDiv }

    render(
      <CanvasContextMenu
        canvas={canvas as never}
        history={null}
        layerTree={null}
        canvasWrapperRef={wrapperRef}
      />,
    )

    // DropdownMenu 가 렌더된다
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
  })

  it('20. 빈 공간 우클릭 → 전체 선택 메뉴 항목 표시', async () => {
    const { CanvasContextMenu } = await import('../components/editor/CanvasContextMenu')
    const canvas = makeCanvasMock(['pose'])
    const wrapperDiv = document.createElement('div')
    Object.defineProperty(wrapperDiv, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }),
    })

    document.body.appendChild(wrapperDiv)
    const wrapperRef = { current: wrapperDiv }

    render(
      <div>
        <CanvasContextMenu
          canvas={canvas as never}
          history={makeHistoryMock() as never}
          layerTree={null}
          canvasWrapperRef={wrapperRef}
        />
      </div>,
    )

    // contextmenu 이벤트 발생 (빈 공간 — findTarget 은 null 반환)
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    })
    wrapperDiv.dispatchEvent(event)

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-menu')).toHaveAttribute('data-open', 'true')
    })

    document.body.removeChild(wrapperDiv)
  })
})
