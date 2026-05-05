'use client'

/**
 * Toast 시스템
 *
 * 자체 구현 (Radix Toast 미사용). 싱글톤 내부 상태 + React Context 하이브리드.
 * 컴포넌트 외부(async 핸들러, 유틸 함수)에서도 showToast() 로 호출 가능.
 *
 * 사용:
 *   // layout.tsx
 *   <ToastProvider />
 *
 *   // 컴포넌트 내부
 *   const { show, dismiss } = useToast()
 *   show({ message: '저장됨', variant: 'success' })
 *
 *   // 컴포넌트 외부
 *   import { showToast } from '@storywork/ui'
 *   showToast('오류 발생', 'error', 5000)
 */

import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils/cn.js'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface ToastOptions {
  message: string
  variant?: ToastVariant
  /** ms. Infinity 이면 수동 닫기만 가능. 기본값 3000 */
  duration?: number
  action?: { label: string; onClick: () => void }
  /** 커스텀 id. 없으면 자동 생성 */
  id?: string
}

interface ToastItem extends Required<Omit<ToastOptions, 'action' | 'id'>> {
  id: string
  action?: ToastOptions['action']
  /** 슬라이드아웃 애니메이션 실행 중 여부 */
  exiting: boolean
}

// ─── 싱글톤 상태 (React 트리 외부에서도 접근) ────────────────────────────────

type Listener = (toasts: ToastItem[]) => void

let _toasts: ToastItem[] = []
const _listeners = new Set<Listener>()

function _notify() {
  _listeners.forEach((l) => l([..._toasts]))
}

function _push(opts: ToastOptions): string {
  const id = opts.id ?? `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const duration = opts.duration ?? 3000
  const item: ToastItem = {
    id,
    message: opts.message,
    variant: opts.variant ?? 'default',
    duration,
    action: opts.action,
    exiting: false,
  }

  // 중복 id 방지
  _toasts = _toasts.filter((t) => t.id !== id)
  _toasts = [..._toasts, item]
  _notify()

  if (duration !== Infinity) {
    setTimeout(() => _startExit(id), duration)
  }
  return id
}

function _startExit(id: string) {
  _toasts = _toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t))
  _notify()
  // 애니메이션(300ms) 후 제거
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    _notify()
  }, 300)
}

function _dismiss(id: string) {
  _startExit(id)
}

function _dismissAll() {
  const ids = _toasts.map((t) => t.id)
  ids.forEach(_startExit)
}

// ─── 테스트 전용 리셋 헬퍼 ───────────────────────────────────────────────────
/** @internal 테스트에서 싱글톤 상태를 초기화할 때 사용합니다. */
export function _resetToastState() {
  _toasts = []
  _notify()
}

// ─── 공개 헬퍼 (컴포넌트 외부 사용) ─────────────────────────────────────────

/**
 * 컴포넌트 외부에서 토스트를 표시합니다.
 *
 * @example
 * showToast('저장됐습니다', 'success')
 * showToast('오류 발생', 'error', 5000)
 */
export function showToast(
  message: string,
  variant: ToastVariant = 'default',
  duration = 3000,
): string {
  return _push({ message, variant, duration })
}

// ─── 훅 ─────────────────────────────────────────────────────────────────────

export interface UseToastReturn {
  show: (opts: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

export function useToast(): UseToastReturn {
  return React.useMemo(
    () => ({
      show: _push,
      dismiss: _dismiss,
      dismissAll: _dismissAll,
    }),
    [],
  )
}

// ─── 아이콘 맵 ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<ToastVariant, React.ElementType> = {
  default: Loader2,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

const ICON_CLASS: Record<ToastVariant, string> = {
  default: 'text-[var(--color-text-muted)]',
  success: 'text-[var(--color-success-500)]',
  warning: 'text-[var(--color-warning-500)]',
  error: 'text-[var(--color-error-500)]',
  info: 'text-[var(--color-info-500)]',
}

const BORDER_CLASS: Record<ToastVariant, string> = {
  default: 'border-l-[var(--color-border)]',
  success: 'border-l-[var(--color-success-500)]',
  warning: 'border-l-[var(--color-warning-500)]',
  error: 'border-l-[var(--color-error-500)]',
  info: 'border-l-[var(--color-info-500)]',
}

// ─── 개별 Toast 아이템 ────────────────────────────────────────────────────────

interface ToastCardProps {
  item: ToastItem
  onDismiss: (id: string) => void
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const Icon = ICON_MAP[item.variant]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        // 레이아웃
        'flex items-start gap-3',
        'min-w-[280px] max-w-[420px] w-full',
        'rounded-[var(--radius-lg)]',
        // 배경 / 테두리
        'bg-[var(--color-surface-raised)]',
        'border border-[var(--color-border)]',
        'border-l-4',
        BORDER_CLASS[item.variant],
        // 그림자
        'shadow-[var(--elevation-e3,0_4px_16px_rgba(0,0,0,0.12))]',
        // 패딩
        'px-4 py-3',
        // 애니메이션 (prefers-reduced-motion 존중은 globals.css 전역 가드가 처리)
        'transition-all duration-[var(--duration-slow)]',
        item.exiting
          ? 'opacity-0 translate-x-2'
          : 'opacity-100 translate-x-0 animate-in slide-in-from-right-4 fade-in-0 duration-[var(--duration-slow)]',
      )}
    >
      <Icon className={cn('size-5 shrink-0 mt-0.5', ICON_CLASS[item.variant])} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text)] leading-snug break-words">{item.message}</p>

        {item.action && (
          <button
            type="button"
            onClick={item.action.onClick}
            className={cn(
              'mt-1.5 text-xs font-medium',
              'text-[var(--color-brand-500)]',
              'hover:text-[var(--color-brand-600)]',
              'focus-visible:outline-none focus-visible:underline',
              // 터치 타겟 최소 44px 높이 확보
              'min-h-[2rem] inline-flex items-center',
            )}
          >
            {item.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="알림 닫기"
        className={cn(
          'shrink-0',
          'size-7 rounded-[var(--radius-sm)]',
          'flex items-center justify-center',
          'text-[var(--color-text-muted)]',
          'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
          'transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── ToastProvider (앱 루트에 한 번 마운트) ──────────────────────────────────

/**
 * 토스트 컨테이너. 앱 루트 레이아웃에 한 번 추가합니다.
 *
 * @example
 * // layout.tsx
 * <ThemeProvider>
 *   {children}
 *   <ToastProvider />
 * </ThemeProvider>
 */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  React.useEffect(() => {
    // 싱글톤 구독
    _listeners.add(setToasts)
    // 마운트 시점에 이미 쌓인 토스트 동기화
    setToasts([..._toasts])
    return () => {
      _listeners.delete(setToasts)
    }
  }, [])

  return (
    <>
      {children}

      {/* 토스트 뷰포트 */}
      <div
        role="region"
        aria-label="알림"
        aria-live="polite"
        className={cn(
          'fixed z-[50] flex flex-col gap-2 pointer-events-none',
          // 데스크톱: 우상단
          'top-4 right-4',
          // 모바일: 풀폭 상단
          'max-md:top-2 max-md:left-2 max-md:right-2',
        )}
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onDismiss={_dismiss} />
          </div>
        ))}
      </div>
    </>
  )
}
