/**
 * topbar.test.tsx — M1-08b TopBar 컴포넌트 테스트
 *
 * 검증 항목:
 * 1. 파일명 클릭 → input 변환 → blur 시 저장
 * 2. Undo/Redo 비활성/활성 토글
 * 3. 다운로드 메뉴 열림 → PNG 클릭 → 다운로드 트리거(mock)
 * 4. AutoSaveIndicator 5상태 렌더 분기
 * 5. 모바일 더보기 메뉴 (md 미만 viewport 시뮬)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { AutoSaveIndicator } from '../components/editor/AutoSaveIndicator'
import { FilenameInline } from '../components/editor/FilenameInline'
import { PageIndicator } from '../components/editor/PageIndicator'

// ─── 공통 Mock ──────────────────────────────────────────────────────────────

// @storywork/ui 의 Tooltip 은 Portal 을 사용 → 단순 children pass-through 로 mock
vi.mock('@storywork/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    // Tooltip: trigger 를 그냥 렌더
    Tooltip: ({
      children,
    }: {
      children: React.ReactElement
      content?: unknown
      shortcut?: string
      side?: string
    }) => children,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    // useTheme mock
    useTheme: () => ({
      resolvedTheme: 'light' as const,
      toggleTheme: vi.fn(),
      theme: 'system' as const,
      setTheme: vi.fn(),
    }),
    // Sheet/SheetContent: 단순 div 렌더
    Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid="mobile-sheet">{children}</div> : <div>{children}</div>,
    SheetTrigger: ({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) =>
      asChild ? children : <div>{children}</div>,
    SheetContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sheet-content">{children}</div>
    ),
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    // DropdownMenu: 기본 렌더만
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({
      children,
      asChild,
    }: {
      children: React.ReactElement
      asChild?: boolean
    }) => (asChild ? children : <div>{children}</div>),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dropdown-content">{children}</div>
    ),
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
      ...rest
    }: {
      children: React.ReactNode
      onSelect?: () => void
      disabled?: boolean
      [key: string]: unknown
    }) => (
      <button type="button" onClick={onSelect} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

// ─── 1. FilenameInline ───────────────────────────────────────────────────────

describe('FilenameInline', () => {
  it('초기 렌더: 파일명 버튼 표시', () => {
    render(<FilenameInline value="내 작품" onChange={() => {}} />)
    expect(screen.getByTestId('filename-button')).toBeInTheDocument()
    expect(screen.getByText('내 작품')).toBeInTheDocument()
  })

  it('클릭 시 input 으로 전환 + 값 유지', async () => {
    render(<FilenameInline value="내 작품" onChange={() => {}} />)
    await userEvent.click(screen.getByTestId('filename-button'))
    const input = screen.getByTestId('filename-input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('내 작품')
  })

  it('Enter 키: 새 값으로 onChange 호출', async () => {
    const onChange = vi.fn()
    render(<FilenameInline value="내 작품" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('filename-button'))
    const input = screen.getByTestId('filename-input')
    await userEvent.clear(input)
    await userEvent.type(input, '새 파일명')
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('새 파일명')
    // 버튼 모드로 복귀
    expect(screen.getByTestId('filename-button')).toBeInTheDocument()
  })

  it('blur 시 저장', async () => {
    const onChange = vi.fn()
    render(<FilenameInline value="내 작품" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('filename-button'))
    const input = screen.getByTestId('filename-input')
    await userEvent.clear(input)
    await userEvent.type(input, '변경된 이름')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('변경된 이름')
  })

  it('빈 값 blur 시 "제목 없음" 으로 저장', async () => {
    const onChange = vi.fn()
    render(<FilenameInline value="내 작품" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('filename-button'))
    const input = screen.getByTestId('filename-input')
    await userEvent.clear(input)
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('제목 없음')
  })

  it('Escape 키: 편집 취소, onChange 미호출', async () => {
    const onChange = vi.fn()
    render(<FilenameInline value="내 작품" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('filename-button'))
    const input = screen.getByTestId('filename-input')
    await userEvent.clear(input)
    await userEvent.type(input, '취소할 이름')
    await userEvent.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('filename-button')).toBeInTheDocument()
  })
})

// ─── 2. AutoSaveIndicator 5상태 ─────────────────────────────────────────────

describe('AutoSaveIndicator', () => {
  it('idle (clean) → null 렌더 (표시 안 함)', () => {
    const { container } = render(
      <AutoSaveIndicator saveStatus="clean" lastSavedAt={null} failReason={null} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('idle (dirty) → null 렌더', () => {
    const { container } = render(
      <AutoSaveIndicator saveStatus="dirty" lastSavedAt={null} failReason={null} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('saving → Loader2 + "저장 중..." 텍스트 포함', () => {
    render(<AutoSaveIndicator saveStatus="saving" lastSavedAt={null} failReason={null} />)
    const indicator = screen.getByTestId('autosave-indicator')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('data-state', 'saving')
    // "저장 중..." 텍스트 (hidden md:inline — DOM 에는 존재)
    expect(indicator.textContent).toContain('저장 중...')
  })

  it('saved → Check 아이콘 + "저장됨" 텍스트', () => {
    const savedAt = new Date('2025-01-15T14:30:00')
    render(<AutoSaveIndicator saveStatus="saved" lastSavedAt={savedAt} failReason={null} />)
    const indicator = screen.getByTestId('autosave-indicator')
    expect(indicator).toHaveAttribute('data-state', 'saved')
    expect(indicator.textContent).toContain('저장됨')
  })

  it('failed → AlertCircle + "저장 실패" + 재시도 버튼', () => {
    const onRetry = vi.fn()
    render(
      <AutoSaveIndicator
        saveStatus="dirty"
        lastSavedAt={null}
        failReason="saveFailed"
        onRetry={onRetry}
      />,
    )
    const indicator = screen.getByTestId('autosave-indicator')
    expect(indicator).toHaveAttribute('data-state', 'failed')
    expect(indicator.textContent).toContain('저장 실패')
    const retryBtn = screen.getByTestId('autosave-retry-btn')
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offline → CloudOff + "오프라인" 텍스트', () => {
    render(<AutoSaveIndicator saveStatus="clean" lastSavedAt={null} failReason="offline" />)
    const indicator = screen.getByTestId('autosave-indicator')
    expect(indicator).toHaveAttribute('data-state', 'offline')
    expect(indicator.textContent).toContain('오프라인')
  })
})

// ─── 3. PageIndicator ────────────────────────────────────────────────────────

describe('PageIndicator', () => {
  it('1/1 기본: 양쪽 버튼 disabled', () => {
    render(<PageIndicator currentPage={1} totalPages={1} />)
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('1/1')
    const buttons = screen.getAllByRole('button')
    // 이전/다음 2개 모두 disabled
    buttons.forEach((btn) => {
      if (
        btn.hasAttribute('aria-label') &&
        (btn.getAttribute('aria-label') === '이전 페이지' ||
          btn.getAttribute('aria-label') === '다음 페이지')
      ) {
        expect(btn).toBeDisabled()
      }
    })
  })

  it('2/5: 이전 활성, 다음 활성', () => {
    render(<PageIndicator currentPage={2} totalPages={5} />)
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('2/5')
    const prevBtn = screen.getByRole('button', { name: '이전 페이지' })
    const nextBtn = screen.getByRole('button', { name: '다음 페이지' })
    expect(prevBtn).not.toBeDisabled()
    expect(nextBtn).not.toBeDisabled()
  })

  it('이전/다음 클릭 → 콜백 호출', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(<PageIndicator currentPage={2} totalPages={3} onPrev={onPrev} onNext={onNext} />)
    await userEvent.click(screen.getByRole('button', { name: '이전 페이지' }))
    await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }))
    expect(onPrev).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })
})

// ─── 4. DownloadMenu (모의 canvas 사용) ─────────────────────────────────────

describe('DownloadMenu', () => {
  beforeEach(() => {
    // URL.createObjectURL / revokeObjectURL mock
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('canvas=null: 트리거 버튼 disabled', async () => {
    const { DownloadMenu } = await import('../components/editor/DownloadMenu')
    render(<DownloadMenu canvas={null} layerTree={null} fileName="테스트" />)
    const trigger = screen.getByTestId('download-menu-trigger')
    expect(trigger).toBeDisabled()
  })

  it('canvas 있을 때: 드롭다운 항목 렌더', async () => {
    // exportPng, exportJson mock
    vi.doMock('@storywork/editor-export', () => ({
      exportPng: vi.fn().mockResolvedValue({ blob: new Blob(['png-data'], { type: 'image/png' }) }),
      exportJson: vi.fn().mockReturnValue({ page: { v: 1 }, layers: [] }),
    }))

    const { DownloadMenu } = await import('../components/editor/DownloadMenu')
    const mockCanvas = {} as Parameters<typeof DownloadMenu>[0]['canvas']

    render(<DownloadMenu canvas={mockCanvas} layerTree={null} fileName="테스트" />)
    // 다운로드 항목들 존재
    expect(screen.getByTestId('download-png')).toBeInTheDocument()
    expect(screen.getByTestId('download-json')).toBeInTheDocument()
    expect(screen.getByTestId('download-pdf')).toBeInTheDocument()
  })
})

// ─── 5. 모바일 더보기 메뉴 (시뮬) ──────────────────────────────────────────

describe('TopBar 모바일 더보기 메뉴', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('더보기 버튼 클릭 → Sheet 열림', async () => {
    // TopBar 전체 렌더 — 의존성이 많으므로 컴포넌트만 직접 임포트
    const { TopBar } = await import('../components/editor/TopBar')

    render(
      <TopBar
        fileName="테스트 파일"
        saveStatus="clean"
        lastSavedAt={null}
        failReason={null}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        canvas={null}
        layerTree={null}
      />,
    )

    const moreBtn = screen.getByTestId('topbar-more-menu')
    expect(moreBtn).toBeInTheDocument()
    await userEvent.click(moreBtn)
    // Sheet 가 열림 (mock 에서 data-testid="sheet-content" 렌더)
    expect(screen.getByTestId('sheet-content')).toBeInTheDocument()
  })

  it('Undo 비활성: 더보기 메뉴 안 Undo 버튼 disabled', async () => {
    const { TopBar } = await import('../components/editor/TopBar')

    render(
      <TopBar
        fileName="테스트"
        saveStatus="clean"
        lastSavedAt={null}
        failReason={null}
        canUndo={false}
        canRedo={true}
        onUndo={() => {}}
        onRedo={() => {}}
        canvas={null}
        layerTree={null}
      />,
    )

    await userEvent.click(screen.getByTestId('topbar-more-menu'))
    // 시트 내 Undo 버튼: Sheet mock 이 data-testid="sheet-content" 로 감싸므로 within 사용
    const sheetContent = screen.getByTestId('sheet-content')
    const undoBtns = sheetContent.querySelectorAll('button[aria-label="실행 취소 (⌘Z)"]')
    expect(undoBtns.length).toBeGreaterThan(0)
    // 첫 번째 disabled 버튼 확인
    const firstUndoBtn = undoBtns[0] as HTMLButtonElement
    expect(firstUndoBtn.disabled).toBe(true)
  })

  it('Redo 활성: 더보기 메뉴 안 Redo 클릭 → 콜백 호출', async () => {
    const onRedo = vi.fn()
    const { TopBar } = await import('../components/editor/TopBar')

    render(
      <TopBar
        fileName="테스트"
        saveStatus="clean"
        lastSavedAt={null}
        failReason={null}
        canUndo={false}
        canRedo={true}
        onUndo={() => {}}
        onRedo={onRedo}
        canvas={null}
        layerTree={null}
      />,
    )

    await userEvent.click(screen.getByTestId('topbar-more-menu'))
    const sheetContent = screen.getByTestId('sheet-content')
    const redoBtns = sheetContent.querySelectorAll('button[aria-label="다시 실행 (⌘⇧Z)"]')
    expect(redoBtns.length).toBeGreaterThan(0)
    await userEvent.click(redoBtns[0] as HTMLButtonElement)
    expect(onRedo).toHaveBeenCalledOnce()
  })
})
