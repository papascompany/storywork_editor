'use client'

// ─────────────────────────────────────────────
// TopBar — 편집기 상단 바 (Canva/Storige 기준 재설계)
//
// 레이아웃:
//   [로고] 파일명▼ │ 페이지N/M ◀ ▶ │ [저장중...] │ ↶ ↷ 미리보기 ⤓▼ 공유
//
// 높이: 56px (데스크톱), 48px (모바일)
// 모바일: 로고 아이콘 + 파일명(가운데) + 더보기(MoreVertical)
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  cn,
  showToast,
  useTheme,
} from '@storywork/ui'
import {
  Eye,
  HelpCircle,
  Moon,
  MoreVertical,
  Redo2,
  Share2,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'

import { AutoSaveIndicator } from './AutoSaveIndicator'
import { DownloadMenu } from './DownloadMenu'
import { FilenameInline } from './FilenameInline'
import { PageIndicator } from './PageIndicator'
import type { AutosaveFailReason, SaveStatus } from './hooks/useAutosave' // eslint-disable-line import/order

// ─── Props ───────────────────────────────────────────────────────────────────

export type TopBarProps = {
  fileName?: string
  onFileNameChange?: (name: string) => void

  // 자동저장
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  failReason: AutosaveFailReason
  onRetrySave?: () => void

  // Undo/Redo
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void

  // 캔버스/레이어 (다운로드용)
  canvas: StoryCanvas | null
  layerTree: LayerTree | null

  // 페이지 (M5 전 기본값 1/1)
  currentPage?: number
  totalPages?: number
  onPrevPage?: () => void
  onNextPage?: () => void

  // M1-08f: 명령 팔레트 / 단축키 모달 트리거
  onOpenCommandPalette?: () => void
  onOpenShortcuts?: () => void
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

export function TopBar({
  fileName = '제목 없음',
  onFileNameChange,
  saveStatus,
  lastSavedAt,
  failReason,
  onRetrySave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canvas,
  layerTree,
  currentPage = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  onOpenCommandPalette,
  onOpenShortcuts,
}: TopBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── 공유 / 미리보기 핸들러 ──────────────────────────────
  const handleShare = () => {
    showToast('공유 기능은 M8에서 활성화됩니다.', 'info')
  }

  const handlePreview = () => {
    showToast('미리보기 기능은 M5에서 활성화됩니다.', 'info')
  }

  // ── 우측 액션 그룹 (데스크톱용) ─────────────────────────
  const rightActions = (
    <>
      {/* Undo */}
      <Tooltip content="실행 취소" shortcut="⌘Z" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="실행 취소 (⌘Z)"
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-undo"
        >
          <Undo2 aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* Redo */}
      <Tooltip content="다시 실행" shortcut="⌘⇧Z" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="다시 실행 (⌘⇧Z)"
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-redo"
        >
          <Redo2 aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-[var(--color-border)]" role="separator" aria-hidden="true" />

      {/* 미리보기 */}
      <Tooltip content="미리보기" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreview}
          aria-label="미리보기"
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-preview"
        >
          <Eye aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* 다운로드 드롭다운 */}
      <DownloadMenu canvas={canvas} layerTree={layerTree} fileName={fileName} />

      {/* 공유 */}
      <Tooltip content="공유" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          aria-label="공유"
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-share"
        >
          <Share2 aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* 테마 토글 */}
      <Tooltip content={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-theme-toggle"
        >
          {resolvedTheme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </Tooltip>

      {/* 도움 버튼 (?) */}
      <Tooltip content="단축키 도움말 (?)" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenShortcuts}
          aria-label="단축키 도움말"
          className="size-9 [&_svg]:size-4"
          data-testid="topbar-shortcuts"
        >
          <HelpCircle aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* ⌘K 힌트 버튼 (데스크톱만) — 클릭 시 CommandPalette 열기 */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        aria-label="명령 팔레트 열기 (⌘K)"
        className={cn(
          'hidden xl:inline-flex items-center',
          'rounded-[var(--radius-sm)]',
          'border border-[var(--color-border)]',
          'bg-[var(--color-surface-muted)]',
          'px-1.5 py-0.5',
          'text-[10px] font-mono leading-none',
          'text-[var(--color-text-muted)]',
          'cursor-pointer select-none',
          'hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        ⌘K
      </button>
    </>
  )

  return (
    <header
      role="banner"
      style={{ boxShadow: 'var(--elevation-e1, 0 1px 2px rgba(0,0,0,0.05))' }}
      className={cn(
        // 레이아웃
        'flex shrink-0 items-center gap-2',
        // 높이: 56px 데스크톱, 48px 모바일
        'h-12 md:h-14',
        // 배경/보더
        'bg-[var(--editor-panel,var(--color-surface))]',
        'border-b border-[var(--editor-border,var(--color-border))]',
        // 패딩
        'px-2 md:px-3',
        // z-index (panel 레이어)
        'z-[20]',
      )}
    >
      {/* ── 좌측 그룹 ─────────────────────────────────────── */}
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        {/* 로고 */}
        <Tooltip content="StoryWork 홈" side="bottom">
          <Link
            href="/"
            className={cn(
              'flex shrink-0 items-center gap-1',
              'rounded-[var(--radius-sm)] px-1 py-0.5',
              'font-bold text-[var(--editor-text,var(--color-text))]',
              'transition-colors duration-[var(--duration-fast)]',
              'hover:text-[var(--editor-accent,var(--color-brand-500))]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
              'focus-visible:ring-offset-[var(--color-surface)]',
              // 터치 타겟
              'min-h-[2.75rem] min-w-[2.75rem] inline-flex items-center',
            )}
            aria-label="StoryWork 홈으로 이동"
          >
            <Sparkles
              className="size-4 text-[var(--editor-accent,var(--color-brand-500))]"
              aria-hidden="true"
            />
            <span className="hidden text-sm sm:inline">StoryWork</span>
          </Link>
        </Tooltip>

        {/* 파일명 인라인 편집 (데스크톱에서 전체 표시) */}
        <div className="hidden sm:flex items-center gap-0.5">
          {/* 구분선 */}
          <div
            className="mx-1 h-4 w-px bg-[var(--color-border)]"
            role="separator"
            aria-hidden="true"
          />

          <FilenameInline value={fileName} onChange={onFileNameChange ?? (() => {})} />

          {/* 파일 드롭다운 (M2 이후 활성) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="파일 메뉴"
                className="size-6 [&_svg]:size-3 opacity-50 hover:opacity-100"
              >
                {/* ChevronDown 아이콘 인라인 (lucide 직접 사용 피하기 위해 svg) */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>파일</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => showToast('새 파일 기능은 M2에서 활성화됩니다.', 'info')}
                aria-label="새 파일 만들기"
              >
                새 파일
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => showToast('파일 열기 기능은 M2에서 활성화됩니다.', 'info')}
                aria-label="파일 열기"
              >
                파일 열기
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => showToast('복제 기능은 M2에서 활성화됩니다.', 'info')}
                aria-label="현재 파일 복제"
              >
                복제
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => showToast('삭제 기능은 M2에서 활성화됩니다.', 'info')}
                aria-label="현재 파일 삭제"
                className="text-[var(--color-error-500)]"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── 모바일 파일명 (가운데 정렬) ─────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center justify-center sm:hidden">
        <span
          className="max-w-[160px] truncate text-sm font-medium text-[var(--editor-text,var(--color-text))]"
          title={fileName}
        >
          {fileName || '제목 없음'}
        </span>
      </div>

      {/* ── 가운데 그룹 (데스크톱) ───────────────────────────── */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-2">
        {/* 페이지 인디케이터 */}
        <PageIndicator
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={onPrevPage}
          onNext={onNextPage}
        />

        {/* 구분선 */}
        <div className="h-5 w-px bg-[var(--color-border)]" role="separator" aria-hidden="true" />

        {/* 자동저장 인디케이터 */}
        <AutoSaveIndicator
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          failReason={failReason}
          onRetry={onRetrySave}
        />
      </div>

      {/* ── sm only 자동저장 인디케이터 ─────────────────────── */}
      <div className="hidden sm:flex md:hidden flex-1 items-center justify-center">
        <AutoSaveIndicator
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          failReason={failReason}
          onRetry={onRetrySave}
        />
      </div>

      {/* ── 우측 그룹 (데스크톱) ─────────────────────────────── */}
      <div
        className="hidden md:flex shrink-0 items-center gap-0.5"
        role="toolbar"
        aria-label="편집 도구"
      >
        {rightActions}
      </div>

      {/* ── 모바일 더보기 메뉴 ───────────────────────────────── */}
      <div className="flex shrink-0 items-center md:hidden">
        {/* 자동저장 아이콘 (모바일) */}
        <AutoSaveIndicator
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          failReason={failReason}
          onRetry={onRetrySave}
          className="mr-1"
        />

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="더보기 메뉴"
              className="size-11 [&_svg]:size-5"
              data-testid="topbar-more-menu"
            >
              <MoreVertical aria-hidden="true" />
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="max-h-[80dvh]">
            <SheetHeader>
              <SheetTitle>편집기 메뉴</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-1 py-4">
              {/* Undo */}
              <button
                type="button"
                onClick={() => {
                  onUndo()
                  setMobileMenuOpen(false)
                }}
                disabled={!canUndo}
                aria-label="실행 취소 (⌘Z)"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  'min-h-[2.75rem]',
                )}
              >
                <Undo2 className="size-5" aria-hidden="true" />
                실행 취소
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">⌘Z</span>
              </button>

              {/* Redo */}
              <button
                type="button"
                onClick={() => {
                  onRedo()
                  setMobileMenuOpen(false)
                }}
                disabled={!canRedo}
                aria-label="다시 실행 (⌘⇧Z)"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  'min-h-[2.75rem]',
                )}
              >
                <Redo2 className="size-5" aria-hidden="true" />
                다시 실행
                <span className="ml-auto text-xs text-[var(--color-text-muted)]">⌘⇧Z</span>
              </button>

              <div className="my-1 h-px bg-[var(--color-border)]" role="separator" />

              {/* 미리보기 */}
              <button
                type="button"
                onClick={() => {
                  handlePreview()
                  setMobileMenuOpen(false)
                }}
                aria-label="미리보기"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'min-h-[2.75rem]',
                )}
              >
                <Eye className="size-5" aria-hidden="true" />
                미리보기
              </button>

              {/* PNG 다운로드 */}
              <button
                type="button"
                onClick={() => {
                  // DownloadMenu 로직과 동일하게 처리 — canvas 없을 시 무시
                  if (!canvas) {
                    showToast('캔버스가 초기화되지 않았습니다.', 'error')
                    return
                  }
                  void (async () => {
                    try {
                      const { exportPng: ep } = await import('@storywork/editor-export')
                      const result = await ep(canvas, { scale: 2, background: '#ffffff' })
                      const url = URL.createObjectURL(result.blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${fileName}.png`
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 1000)
                    } catch {
                      showToast('PNG 내보내기에 실패했습니다.', 'error')
                    }
                  })()
                  setMobileMenuOpen(false)
                }}
                disabled={!canvas}
                aria-label="PNG 이미지로 다운로드"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  'min-h-[2.75rem]',
                )}
              >
                {/* FileImage icon inline */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                PNG 다운로드
              </button>

              {/* 공유 */}
              <button
                type="button"
                onClick={() => {
                  handleShare()
                  setMobileMenuOpen(false)
                }}
                aria-label="공유"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'min-h-[2.75rem]',
                )}
              >
                <Share2 className="size-5" aria-hidden="true" />
                공유
              </button>

              <div className="my-1 h-px bg-[var(--color-border)]" role="separator" />

              {/* 테마 토글 */}
              <button
                type="button"
                onClick={() => {
                  toggleTheme()
                  setMobileMenuOpen(false)
                }}
                aria-label={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm rounded-[var(--radius-md)]',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
                  'min-h-[2.75rem]',
                )}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="size-5" aria-hidden="true" />
                ) : (
                  <Moon className="size-5" aria-hidden="true" />
                )}
                {resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
