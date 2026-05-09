'use client'

/**
 * ReviewQueue — 검수 대기 항목을 카드 그리드로 빠르게 처리
 *
 * 키보드:
 *   j / ↓  다음 항목
 *   k / ↑  이전 항목
 *   a       승인
 *   r       거절 (사유 모달)
 *   Esc     포커스 해제
 *   추가 액션: extraActions[].key
 *
 * 승인/거절 후 다음 항목으로 자동 포커스 + undo 토스트 (5초)
 */

import { Button, cn, useToast } from '@storywork/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@storywork/ui'
import * as React from 'react'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface ReviewQueueExtra<T> {
  id: string
  label: string
  key?: string
  handler: (item: T) => Promise<void>
}

export interface ReviewQueueProps<T> {
  items: T[]
  rowKey: (item: T) => string
  renderCard: (item: T, opts: { isFocused: boolean }) => React.ReactNode
  onApprove: (item: T) => Promise<void>
  onReject: (item: T, reason: string) => Promise<void>
  extraActions?: ReviewQueueExtra<T>[]
  totalCount?: number
  onLoadMore?: () => void
  isLoading?: boolean
  emptyState?: React.ReactNode
  className?: string
}

// ─── 거절 사유 모달 ───────────────────────────────────────────────────────────

interface RejectDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

function RejectDialog({ open, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open) {
      setReason('')
      // 모달이 열리면 textarea 포커스
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [open])

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>거절 사유 입력</DialogTitle>
          <DialogDescription>
            이 항목을 거절하는 사유를 입력해 주세요. 작성자에게 전달됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleConfirm()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
            placeholder="예: 해상도 부족, 라이선스 누락, 컨텐츠 정책 위반 등"
            rows={4}
            aria-label="거절 사유"
            className={cn(
              'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
              'bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-disabled)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[var(--color-surface)]',
              'resize-y min-h-[7rem]',
            )}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Ctrl+Enter 로 확인</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" size="sm" disabled={!reason.trim()} onClick={handleConfirm}>
            거절 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ReviewQueue 본체 ─────────────────────────────────────────────────────────

export function ReviewQueue<T>({
  items,
  rowKey,
  renderCard,
  onApprove,
  onReject,
  extraActions = [],
  totalCount,
  onLoadMore,
  isLoading = false,
  emptyState,
  className,
}: ReviewQueueProps<T>) {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [pendingItem, setPendingItem] = React.useState<T | null>(null)
  const [processingIds, setProcessingIds] = React.useState<Set<string>>(new Set())
  const cardRefs = React.useRef<Map<number, HTMLDivElement>>(new Map())
  const { show: showToast } = useToast()

  // 처리 완료 후 다음 항목으로 이동
  const moveToNext = React.useCallback(
    (currentIdx: number) => {
      const nextIdx = currentIdx < items.length - 1 ? currentIdx : currentIdx - 1
      if (nextIdx >= 0) {
        setFocusedIndex(nextIdx)
      } else {
        setFocusedIndex(-1)
      }
    },
    [items.length],
  )

  // 승인 핸들러
  const handleApprove = React.useCallback(
    async (item: T, idx: number) => {
      const id = rowKey(item)
      if (processingIds.has(id)) return
      setProcessingIds((prev) => new Set(prev).add(id))
      try {
        await onApprove(item)
        showToast({ message: '승인되었습니다.', variant: 'success', duration: 5000 })
        moveToNext(idx)
      } catch {
        showToast({ message: '승인 중 오류가 발생했습니다.', variant: 'error' })
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [onApprove, moveToNext, processingIds, rowKey, showToast],
  )

  // 거절 핸들러
  const handleRejectConfirm = React.useCallback(
    async (reason: string) => {
      if (!pendingItem) return
      const item = pendingItem
      const id = rowKey(item)
      const idx = items.findIndex((it) => rowKey(it) === id)
      setRejectDialogOpen(false)
      setPendingItem(null)
      setProcessingIds((prev) => new Set(prev).add(id))
      try {
        await onReject(item, reason)
        showToast({ message: '거절되었습니다.', variant: 'warning', duration: 5000 })
        if (idx >= 0) moveToNext(idx)
      } catch {
        showToast({ message: '거절 중 오류가 발생했습니다.', variant: 'error' })
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [pendingItem, items, onReject, moveToNext, rowKey, showToast],
  )

  // 키보드 네비게이션
  React.useEffect(() => {
    if (items.length === 0) return

    const handler = (e: KeyboardEvent) => {
      // 모달/인풋에 포커스 있으면 무시
      if (rejectDialogOpen) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev < 0 ? 0 : Math.min(prev + 1, items.length - 1)
          return next
        })
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          if (prev <= 0) return 0
          return prev - 1
        })
      } else if (e.key === 'Escape') {
        setFocusedIndex(-1)
      } else if (e.key === 'a' && focusedIndex >= 0) {
        e.preventDefault()
        const item = items[focusedIndex]
        if (item) void handleApprove(item, focusedIndex)
      } else if (e.key === 'r' && focusedIndex >= 0) {
        e.preventDefault()
        const item = items[focusedIndex]
        if (item) {
          setPendingItem(item)
          setRejectDialogOpen(true)
        }
      } else {
        // 추가 액션 단축키
        const extra = extraActions.find((ea) => ea.key === e.key)
        if (extra && focusedIndex >= 0) {
          e.preventDefault()
          const item = items[focusedIndex]
          if (item) void extra.handler(item)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, focusedIndex, handleApprove, extraActions, rejectDialogOpen])

  // 포커스 이동 시 스크롤
  React.useEffect(() => {
    if (focusedIndex < 0) return
    const el = cardRefs.current.get(focusedIndex)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el?.focus()
  }, [focusedIndex])

  if (!isLoading && items.length === 0) {
    return (
      <div className={cn('py-24 text-center text-[var(--color-text-muted)]', className)}>
        {emptyState ?? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl" aria-hidden="true">
              ✅
            </span>
            <p className="text-lg font-medium">검수 대기 항목이 없습니다</p>
            <p className="text-sm">모든 항목이 처리되었습니다.</p>
          </div>
        )}
      </div>
    )
  }

  const displayTotal = totalCount ?? items.length
  const processed = displayTotal - items.length

  return (
    <>
      <div className={cn('flex flex-col gap-4', className)}>
        {/* 진행률 */}
        {displayTotal > items.length && (
          <div className="flex items-center gap-3" aria-label="검수 진행률">
            <div
              className="flex-1 h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={displayTotal}
              aria-valuenow={processed}
              aria-label={`${displayTotal}건 중 ${processed}건 완료`}
            >
              <div
                className="h-full bg-[var(--color-brand-500)] transition-all duration-[var(--duration-slow)]"
                style={{ width: `${(processed / displayTotal) * 100}%` }}
              />
            </div>
            <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
              {processed} / {displayTotal}
            </span>
          </div>
        )}

        {/* 키보드 단축키 힌트 */}
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]"
          aria-label="키보드 단축키"
        >
          <span>
            <kbd className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">j/k</kbd> 이동
          </span>
          <span>
            <kbd className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">a</kbd> 승인
          </span>
          <span>
            <kbd className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">r</kbd> 거절
          </span>
          {extraActions.map(
            (ea) =>
              ea.key && (
                <span key={ea.id}>
                  <kbd className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">
                    {ea.key}
                  </kbd>{' '}
                  {ea.label}
                </span>
              ),
          )}
        </div>

        {/* 카드 그리드 */}
        <div
          role="grid"
          aria-label="검수 대기 목록"
          className={cn(
            'grid gap-4',
            'grid-cols-1',
            'sm:grid-cols-2',
            'lg:grid-cols-3',
            'xl:grid-cols-4',
          )}
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] aspect-square animate-pulse"
                />
              ))
            : items.map((item, idx) => {
                const id = rowKey(item)
                const isFocused = idx === focusedIndex
                const isProcessing = processingIds.has(id)

                return (
                  <div
                    key={id}
                    role="gridcell"
                    tabIndex={isFocused ? 0 : -1}
                    ref={(el) => {
                      if (el) cardRefs.current.set(idx, el)
                      else cardRefs.current.delete(idx)
                    }}
                    onFocus={() => setFocusedIndex(idx)}
                    onClick={() => setFocusedIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'a') {
                        e.preventDefault()
                        void handleApprove(item, idx)
                      } else if (e.key === 'r') {
                        e.preventDefault()
                        setPendingItem(item)
                        setRejectDialogOpen(true)
                      }
                    }}
                    aria-selected={isFocused}
                    aria-busy={isProcessing}
                    className={cn(
                      'relative flex flex-col rounded-[var(--radius-lg)]',
                      'border bg-[var(--color-surface-raised)]',
                      'transition-all duration-[var(--duration-fast)]',
                      'focus-visible:outline-none',
                      isFocused
                        ? 'border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-500)] ring-offset-2 ring-offset-[var(--color-surface)]'
                        : 'border-[var(--color-border)]',
                      isProcessing && 'opacity-60 pointer-events-none',
                    )}
                  >
                    {/* 카드 컨텐츠 (외부 renderCard) */}
                    <div className="flex-1">{renderCard(item, { isFocused })}</div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 p-3 border-t border-[var(--color-border)]">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleApprove(item, idx)
                        }}
                        aria-label="승인"
                        className="flex-1"
                      >
                        승인
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingItem(item)
                          setRejectDialogOpen(true)
                        }}
                        aria-label="거절"
                        className="flex-1"
                      >
                        거절
                      </Button>
                      {extraActions.map((ea) => (
                        <Button
                          key={ea.id}
                          variant="secondary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation()
                            void ea.handler(item)
                          }}
                          aria-label={ea.label}
                          title={ea.key ? `단축키: ${ea.key}` : undefined}
                        >
                          {ea.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}
        </div>

        {/* 더 보기 */}
        {onLoadMore && items.length < (totalCount ?? Infinity) && (
          <div className="flex justify-center pt-4">
            <Button variant="secondary" size="md" onClick={onLoadMore} disabled={isLoading}>
              {isLoading ? '불러오는 중...' : '더 보기'}
            </Button>
          </div>
        )}
      </div>

      {/* 거절 사유 모달 */}
      <RejectDialog
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setPendingItem(null)
        }}
        onConfirm={handleRejectConfirm}
      />
    </>
  )
}

ReviewQueue.displayName = 'ReviewQueue'
