'use client'

// ─────────────────────────────────────────────
// PageIndicator — 페이지 N / M + 이전/다음 버튼
// M5 페이지 기능 전까지: 항상 1/1, 버튼 비활성
// ─────────────────────────────────────────────

import { Button, Tooltip, cn } from '@storywork/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

export type PageIndicatorProps = {
  currentPage?: number
  totalPages?: number
  onPrev?: () => void
  onNext?: () => void
  onTogglePanel?: () => void
  className?: string
}

export function PageIndicator({
  currentPage = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onTogglePanel,
  className,
}: PageIndicatorProps) {
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="group"
      aria-label="페이지 탐색"
    >
      {/* 이전 페이지 */}
      <Tooltip content="이전 페이지" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="이전 페이지"
          className="size-8 [&_svg]:size-4"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* 페이지 인디케이터 */}
      <button
        type="button"
        onClick={onTogglePanel}
        aria-label={`현재 페이지 ${currentPage} / 전체 ${totalPages} 페이지. 클릭하여 페이지 패널 열기`}
        className={cn(
          'min-w-[52px] px-2 py-1',
          'rounded-[var(--radius-sm)]',
          'text-xs font-medium tabular-nums text-[var(--color-text-muted)]',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
          'focus-visible:ring-offset-[var(--color-surface)]',
          // 터치 타겟
          'min-h-[2.25rem] inline-flex items-center justify-center',
        )}
        data-testid="page-indicator"
      >
        <span aria-current="page">{currentPage}</span>
        <span className="mx-0.5 text-[var(--color-border)]">/</span>
        <span>{totalPages}</span>
      </button>

      {/* 다음 페이지 */}
      <Tooltip content="다음 페이지" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="다음 페이지"
          className="size-8 [&_svg]:size-4"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </Tooltip>
    </div>
  )
}
