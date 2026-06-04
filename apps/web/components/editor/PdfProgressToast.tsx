'use client'

/**
 * apps/web/components/editor/PdfProgressToast.tsx
 *
 * PDF 비동기 잡 진행률 Toast 컴포넌트.
 *
 * - 데스크톱: 우상단 fixed 포지션 (z-[60])
 * - 모바일: 좌우 풀폭, 하단 safe area 위
 *
 * 상태별 스타일:
 *   queued     → 회색
 *   running    → 파란색 + 진행 바
 *   succeeded  → 초록색 + "다운로드" 버튼
 *   failed     → 빨간색 + 에러 메시지
 *
 * DESIGN-nike SSOT 토큰:
 *   진행 바: var(--color-brand-500) fill / var(--color-surface-muted) track
 */

import { cn } from '@storywork/ui'
import { CheckCircle, Download, Loader2, X, XCircle } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type { PdfJobStatus } from '@/lib/realtime/pdf-progress'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface PdfProgressToastProps {
  jobId: string | null
  progress: number
  status: PdfJobStatus
  pdfUrl: string | null
  message: string | null
  error: string | null
  onDismiss: () => void
}

// ─── 상태별 색상 토큰 ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PdfJobStatus,
  {
    label: string
    borderClass: string
    iconClass: string
    chipBg: string
    chipText: string
  }
> = {
  queued: {
    label: '대기 중',
    borderClass: 'border-l-[var(--color-border)]',
    iconClass: 'text-[var(--color-text-muted)]',
    chipBg: 'bg-[var(--color-surface-muted)]',
    chipText: 'text-[var(--color-text-muted)]',
  },
  running: {
    label: 'PDF 생성 중',
    borderClass: 'border-l-[var(--color-info-500)]',
    iconClass: 'text-[var(--color-info-500)]',
    chipBg: 'bg-[color-mix(in_srgb,var(--color-info-500)_12%,transparent)]',
    chipText: 'text-[var(--color-info-500)]',
  },
  succeeded: {
    label: '완료',
    borderClass: 'border-l-[var(--color-success-500)]',
    iconClass: 'text-[var(--color-success-500)]',
    chipBg: 'bg-[color-mix(in_srgb,var(--color-success-500)_12%,transparent)]',
    chipText: 'text-[var(--color-success-500)]',
  },
  failed: {
    label: '실패',
    borderClass: 'border-l-[var(--color-error-500)]',
    iconClass: 'text-[var(--color-error-500)]',
    chipBg: 'bg-[color-mix(in_srgb,var(--color-error-500)_12%,transparent)]',
    chipText: 'text-[var(--color-error-500)]',
  },
}

// ─── 진행 바 ─────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`PDF 생성 진행률 ${clamped}%`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
    >
      <div
        className={cn(
          'h-full rounded-full',
          'bg-[var(--color-brand-500)]',
          'transition-[width] duration-500 ease-out',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ─── 상태 칩 ─────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: PdfJobStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5',
        'rounded-full text-[10px] font-medium leading-none',
        config.chipBg,
        config.chipText,
      )}
    >
      {config.label}
    </span>
  )
}

// ─── PdfProgressToast ─────────────────────────────────────────────────────────

export function PdfProgressToast({
  jobId,
  progress,
  status,
  pdfUrl,
  message,
  error,
  onDismiss,
}: PdfProgressToastProps) {
  const config = STATUS_CONFIG[status]
  const [visible, setVisible] = useState(false)

  // 마운트 시 fade-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // succeeded 후 8초 뒤 자동 닫기
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (status === 'succeeded') {
      autoCloseRef.current = setTimeout(onDismiss, 8000)
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    }
  }, [status, onDismiss])

  if (!jobId) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        // 레이아웃
        'flex flex-col gap-2',
        'min-w-[280px] max-w-[380px] w-full',
        'rounded-[var(--radius-lg)]',
        // 배경 / 테두리
        'bg-[var(--color-surface-raised)]',
        'border border-[var(--color-border)]',
        'border-l-4',
        config.borderClass,
        // 그림자
        'shadow-[var(--elevation-e3,0_4px_16px_rgba(0,0,0,0.12))]',
        // 패딩
        'px-4 py-3',
        // fade-in 애니메이션
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      data-testid="pdf-progress-toast"
    >
      {/* 헤더 행 */}
      <div className="flex items-center gap-2">
        {/* 아이콘 */}
        {status === 'running' || status === 'queued' ? (
          <Loader2
            className={cn('size-4 shrink-0', config.iconClass, 'animate-spin')}
            aria-hidden="true"
          />
        ) : status === 'succeeded' ? (
          <CheckCircle className={cn('size-4 shrink-0', config.iconClass)} aria-hidden="true" />
        ) : (
          <XCircle className={cn('size-4 shrink-0', config.iconClass)} aria-hidden="true" />
        )}

        {/* 제목 */}
        <span className="flex-1 text-sm font-medium text-[var(--color-text)]">PDF 출판</span>

        {/* 상태 칩 */}
        <StatusChip status={status} />

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="닫기"
          className={cn(
            'size-6 flex items-center justify-center',
            'rounded-[var(--radius-sm)]',
            'text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
            'transition-colors',
          )}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 진행 바 (queued / running) */}
      {(status === 'queued' || status === 'running') && <ProgressBar value={progress} />}

      {/* 메시지 */}
      {message && status !== 'succeeded' && (
        <p className="text-xs text-[var(--color-text-muted)] leading-snug">{message}</p>
      )}

      {/* 에러 메시지 */}
      {error && status === 'failed' && (
        <p className="text-xs text-[var(--color-error-500)] leading-snug">{error}</p>
      )}

      {/* 완료 시: progress 100% + 다운로드 버튼 */}
      {status === 'succeeded' && (
        <div className="flex items-center gap-2">
          <ProgressBar value={100} />
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5',
                'px-3 py-1 rounded-[var(--radius-md)]',
                'text-xs font-medium',
                'bg-[var(--color-brand-500)] text-white',
                'hover:bg-[var(--color-brand-600)]',
                'transition-colors',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
              )}
              aria-label="PDF 다운로드"
              data-testid="pdf-download-btn"
            >
              <Download className="size-3" aria-hidden="true" />
              다운로드
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PdfProgressToastContainer ────────────────────────────────────────────────

/**
 * 진행률 Toast 를 fixed 위치에 렌더링하는 컨테이너.
 * TopBar 또는 EditorShell 루트에서 한 번만 마운트합니다.
 */
export function PdfProgressToastContainer(props: PdfProgressToastProps) {
  if (!props.jobId) return null

  return (
    <div
      className={cn(
        'fixed z-[60] pointer-events-none',
        // 데스크톱: 우상단 (z > ToastProvider 의 z-[50])
        'top-16 right-4',
        // 모바일: 좌우 여백 확보, TopBar 아래
        'max-md:left-2 max-md:right-2 max-md:top-14',
      )}
    >
      <div className="pointer-events-auto">
        <PdfProgressToast {...props} />
      </div>
    </div>
  )
}
