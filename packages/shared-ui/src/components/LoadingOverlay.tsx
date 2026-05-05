'use client'

/**
 * LoadingOverlay 컴포넌트
 *
 * 세 가지 변형:
 *   - fullscreen: fixed inset-0, 반투명 백드롭 + 가운데 카드
 *   - panel:      absolute inset-0, 부모 컨테이너 내부만 (부모에 position:relative 필요)
 *   - inline:     배경 없음, 스피너 + 텍스트만
 *
 * @example
 * <LoadingOverlay show={isLoading} message="저장 중..." />
 * <div className="relative">
 *   <LoadingOverlay show={isPanelLoading} variant="panel" />
 *   {content}
 * </div>
 */

import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils/cn.js'

export interface LoadingOverlayProps {
  /** 표시 여부 */
  show: boolean
  /** 로딩 메시지 (선택) */
  message?: string
  /** 변형. 기본값 'fullscreen' */
  variant?: 'fullscreen' | 'panel' | 'inline'
  /** 스피너 크기. 기본값 'md' */
  spinnerSize?: 'sm' | 'md' | 'lg'
}

const SPINNER_SIZE_CLASS: Record<NonNullable<LoadingOverlayProps['spinnerSize']>, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
}

export function LoadingOverlay({
  show,
  message,
  variant = 'fullscreen',
  spinnerSize = 'md',
}: LoadingOverlayProps): React.JSX.Element | null {
  if (!show) return null

  if (variant === 'inline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 text-[var(--color-text-muted)]"
      >
        <Loader2
          className={cn(
            'animate-spin text-[var(--color-brand-500)]',
            SPINNER_SIZE_CLASS[spinnerSize],
          )}
          aria-hidden="true"
        />
        {message && <span className="text-sm text-[var(--color-text-muted)]">{message}</span>}
        <span className="sr-only">{message ?? '로딩 중'}</span>
      </div>
    )
  }

  const isFullscreen = variant === 'fullscreen'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center',
        isFullscreen
          ? 'fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px]'
          : 'absolute inset-0 z-[20] bg-black/30 backdrop-blur-[1px]',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-3',
          'rounded-[var(--radius-xl)]',
          'bg-[var(--color-surface-raised)]',
          'shadow-[var(--elevation-e4,0_8px_32px_rgba(0,0,0,0.16))]',
          'px-6 py-5',
          'min-w-[120px]',
        )}
      >
        <Loader2
          className={cn(
            'animate-spin text-[var(--color-brand-500)]',
            SPINNER_SIZE_CLASS[spinnerSize],
          )}
          aria-hidden="true"
        />
        {message && <p className="text-sm text-[var(--color-text-muted)] text-center">{message}</p>}
        <span className="sr-only">{message ?? '로딩 중'}</span>
      </div>
    </div>
  )
}
