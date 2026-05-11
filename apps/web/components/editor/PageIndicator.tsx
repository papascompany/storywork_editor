'use client'

// ─────────────────────────────────────────────
// PageIndicator — 페이지 인디케이터 + 이전/다음 버튼
//
// 5개 이하: dot(●/○) 클릭 가능한 dot 인디케이터
// 6개 이상: "N / M" 숫자 표시
//
// Footer 에서만 표시 (TopBar 에서는 제거됨 — 중복 방지)
// ─────────────────────────────────────────────

import { Button, Tooltip, cn } from '@storywork/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

export type PageIndicatorProps = {
  currentPage?: number
  totalPages?: number
  onPrev?: () => void
  onNext?: () => void
  onGoToPage?: (pageIndex: number) => void
  onTogglePanel?: () => void
  className?: string
}

/** dot 인디케이터를 사용할 최대 페이지 수 */
const DOT_MAX = 5

export function PageIndicator({
  currentPage = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onGoToPage,
  onTogglePanel,
  className,
}: PageIndicatorProps) {
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const useDots = totalPages <= DOT_MAX

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="group"
      aria-label="페이지 탐색"
    >
      {/* 이전 페이지 */}
      <Tooltip content="이전 페이지 (⌘←)" side="top">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="이전 페이지"
          className="size-7 [&_svg]:size-3.5"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* 인디케이터 영역 */}
      {useDots ? (
        // dot 인디케이터 (5개 이하)
        <div className="flex items-center gap-1 px-1" role="tablist" aria-label="페이지 목록">
          {Array.from({ length: totalPages }, (_, i) => {
            const pageNum = i + 1
            const isCurrent = pageNum === currentPage
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`페이지 ${pageNum}${isCurrent ? ' (현재)' : ''}`}
                onClick={() => {
                  if (!isCurrent) {
                    onGoToPage?.(i)
                  }
                }}
                className={cn(
                  'rounded-full transition-all duration-[var(--duration-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
                  isCurrent
                    ? 'size-2 bg-[var(--color-brand-500)]'
                    : 'size-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]',
                )}
                data-testid={`page-dot-${pageNum}`}
              />
            )
          })}
        </div>
      ) : (
        // 숫자 인디케이터 (6개 이상)
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label={`현재 페이지 ${currentPage} / 전체 ${totalPages} 페이지. 클릭하여 페이지 패널 열기`}
          className={cn(
            'min-w-[48px] px-1.5 py-0.5',
            'rounded-[var(--radius-sm)]',
            'text-xs font-medium tabular-nums text-[var(--color-text-muted)]',
            'transition-colors duration-[var(--duration-fast)]',
            'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
            'focus-visible:ring-offset-[var(--color-surface)]',
            'min-h-[1.75rem] inline-flex items-center justify-center',
          )}
          data-testid="page-indicator"
        >
          <span aria-current="page">{currentPage}</span>
          <span className="mx-0.5 text-[var(--color-border)]">/</span>
          <span>{totalPages}</span>
        </button>
      )}

      {/* 다음 페이지 */}
      <Tooltip content="다음 페이지 (⌘→)" side="top">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="다음 페이지"
          className="size-7 [&_svg]:size-3.5"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </Tooltip>
    </div>
  )
}
