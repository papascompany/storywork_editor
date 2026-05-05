'use client'

// ─────────────────────────────────────────────
// AutoSaveIndicator — 자동 저장 5상태 표시
// idle / saving / saved / failed / offline
// 텍스트: 데스크톱만, 모바일은 아이콘만
// Tooltip: 마지막 저장 시각 (MM월 DD일 HH:mm)
// ─────────────────────────────────────────────

import { Tooltip, cn } from '@storywork/ui'
import { AlertCircle, Check, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import React, { useCallback } from 'react'

import { type AutosaveFailReason, type SaveStatus } from './hooks/useAutosave'

export type AutoSaveIndicatorProps = {
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  failReason: AutosaveFailReason
  onRetry?: () => void
  className?: string
}

type DisplayState = 'idle' | 'saving' | 'saved' | 'failed' | 'offline'

function toDisplayState(saveStatus: SaveStatus, failReason: AutosaveFailReason): DisplayState {
  if (failReason === 'offline') return 'offline'
  if (failReason === 'saveFailed') return 'failed'
  if (saveStatus === 'saving') return 'saving'
  if (saveStatus === 'saved') return 'saved'
  // clean / dirty → idle
  return 'idle'
}

function formatSavedAt(date: Date | null): string {
  if (!date) return '아직 저장 안 됨'
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `마지막 저장: ${m}월 ${d}일 ${hh}:${mm}`
}

export function AutoSaveIndicator({
  saveStatus,
  lastSavedAt,
  failReason,
  onRetry,
  className,
}: AutoSaveIndicatorProps) {
  const displayState = toDisplayState(saveStatus, failReason)
  const tooltipContent = formatSavedAt(lastSavedAt)

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onRetry?.()
    },
    [onRetry],
  )

  if (displayState === 'idle') {
    return null
  }

  const content = (
    <div
      className={cn('flex items-center gap-1.5', className)}
      aria-live="polite"
      aria-atomic="true"
      data-testid="autosave-indicator"
      data-state={displayState}
    >
      {/* 저장 중 */}
      {displayState === 'saving' && (
        <>
          <Loader2
            className="size-3.5 animate-spin text-[var(--color-text-muted)] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="hidden text-xs text-[var(--color-text-muted)] md:inline">
            저장 중...
          </span>
        </>
      )}

      {/* 저장됨 */}
      {displayState === 'saved' && (
        <>
          <Check className="size-3.5 text-[var(--color-success-500)]" aria-hidden="true" />
          <span className="hidden text-xs text-[var(--color-text-muted)] md:inline">저장됨</span>
        </>
      )}

      {/* 저장 실패 */}
      {displayState === 'failed' && (
        <>
          <AlertCircle className="size-3.5 text-[var(--color-error-500)]" aria-hidden="true" />
          <span className="hidden text-xs text-[var(--color-error-500)] md:inline">저장 실패</span>
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              aria-label="저장 재시도"
              className={cn(
                'hidden md:inline-flex items-center gap-0.5',
                'text-xs text-[var(--color-brand-500)]',
                'rounded-[var(--radius-sm)] px-1 py-0.5',
                'hover:underline',
                'focus-visible:outline-none focus-visible:ring-1',
                'focus-visible:ring-[var(--color-brand-500)]',
                // 터치 타겟 최소 확보
                'min-h-[1.5rem]',
              )}
              data-testid="autosave-retry-btn"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              재시도
            </button>
          )}
        </>
      )}

      {/* 오프라인 */}
      {displayState === 'offline' && (
        <>
          <CloudOff className="size-3.5 text-[var(--color-warning-500)]" aria-hidden="true" />
          <span className="hidden text-xs text-[var(--color-warning-500)] md:inline">
            오프라인 (로컬 백업됨)
          </span>
        </>
      )}
    </div>
  )

  // idle 이 아닌 상태는 tooltip 으로 감싸 마지막 저장 시각 표시
  return (
    <Tooltip content={tooltipContent} side="bottom">
      {content}
    </Tooltip>
  )
}
