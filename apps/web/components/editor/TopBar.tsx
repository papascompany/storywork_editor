'use client'

// ─────────────────────────────────────────────
// TopBar — 파일명 · 저장상태 · Undo/Redo · 내보내기 · 테마토글
// ─────────────────────────────────────────────

import { Button, cn, useTheme } from '@storywork/ui'
import { Moon, Redo2, Sun, Undo2 } from 'lucide-react'

import type { SaveStatus } from './hooks/useAutosave'

type TopBarProps = {
  fileName?: string
  saveStatus: SaveStatus
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  exportMenu: React.ReactNode
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  clean: '저장됨',
  dirty: '편집 중',
  saving: '저장 중...',
  saved: '저장됨',
}

const SAVE_COLOR: Record<SaveStatus, string> = {
  clean: 'text-[var(--color-text-muted)]',
  dirty: 'text-[var(--color-warning-500,#f59e0b)]',
  saving: 'text-[var(--color-text-muted)]',
  saved: 'text-[var(--color-success-500,#22c55e)]',
}

export function TopBar({
  fileName = '제목 없음',
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  exportMenu,
}: TopBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <header
      role="banner"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)]',
        'bg-[var(--color-surface)] px-3',
        'md:h-14',
        // 모바일: 48px
        'max-md:h-12',
      )}
    >
      {/* 좌측: 로고 */}
      <a
        href="/"
        className="flex shrink-0 items-center gap-1 font-bold text-[var(--color-text)]"
        aria-label="StoryWork 홈"
      >
        <span className="text-[var(--color-brand-500)]">S</span>
        <span className="hidden sm:inline">toryWork</span>
      </a>

      {/* 가운데: 파일명 + 저장 상태 */}
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span
          className="max-w-xs truncate text-sm font-medium text-[var(--color-text)]"
          title={fileName}
        >
          {fileName}
        </span>
        <span className={cn('text-xs', SAVE_COLOR[saveStatus])} aria-live="polite" aria-atomic>
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>

      {/* 우측: 액션 그룹 */}
      <div className="flex shrink-0 items-center gap-1" role="toolbar" aria-label="편집 도구">
        {/* Undo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="실행 취소 (⌘Z)"
          title="실행 취소 (⌘Z)"
        >
          <Undo2 />
        </Button>

        {/* Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="다시 실행 (⌘⇧Z)"
          title="다시 실행 (⌘⇧Z)"
        >
          <Redo2 />
        </Button>

        {/* ExportMenu 슬롯 */}
        {exportMenu}

        {/* 다크모드 토글 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  )
}
