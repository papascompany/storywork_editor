'use client'

/**
 * BulkActionBar — DataTable selectable 과 짝꿍. 선택 N개에 대한 일괄 액션.
 *
 * - 화면 하단 fixed, 가운데 정렬
 * - 선택 0개 → 숨김 (slide-up 애니 200ms)
 * - undo 토스트: handler 가 { undoable: true, undo } 반환 시 5초간 노출
 * - destructive variant: 확인 모달 자동 표시
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

export interface BulkAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'default' | 'destructive'
  handler: () => Promise<{ undoable?: boolean; undo?: () => Promise<void> } | void>
}

export interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: BulkAction[]
  className?: string
}

// ─── 확인 모달 ───────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  actionLabel: string
  selectedCount: number
  onConfirm: () => void
  onClose: () => void
}

function ConfirmDialog({
  open,
  actionLabel,
  selectedCount,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>일괄 작업 확인</DialogTitle>
          <DialogDescription>
            선택한 <strong>{selectedCount}개</strong> 항목에 대해{' '}
            <strong>&quot;{actionLabel}&quot;</strong> 을(를) 실행합니다. 계속하겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── BulkActionBar 본체 ──────────────────────────────────────────────────────

export function BulkActionBar({ selectedCount, onClear, actions, className }: BulkActionBarProps) {
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [confirmAction, setConfirmAction] = React.useState<BulkAction | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)
  const { show: showToast } = useToast()

  // 선택 수 변경 시 노출/숨김 애니
  React.useEffect(() => {
    if (selectedCount > 0) {
      setIsVisible(true)
    } else {
      // 애니 후 숨김
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [selectedCount])

  const executeAction = React.useCallback(
    async (action: BulkAction) => {
      setProcessingId(action.id)
      try {
        const result = await action.handler()
        if (result?.undoable && result.undo) {
          const undoFn = result.undo
          showToast({
            message: `${action.label} 완료`,
            variant: 'success',
            duration: 5000,
            action: {
              label: '실행 취소',
              onClick: () => {
                void undoFn()
              },
            },
          })
        } else {
          showToast({ message: `${action.label} 완료`, variant: 'success' })
        }
      } catch {
        showToast({ message: `${action.label} 중 오류가 발생했습니다.`, variant: 'error' })
      } finally {
        setProcessingId(null)
      }
    },
    [showToast],
  )

  const handleActionClick = React.useCallback(
    (action: BulkAction) => {
      if (action.variant === 'destructive') {
        setConfirmAction(action)
      } else {
        void executeAction(action)
      }
    },
    [executeAction],
  )

  if (!isVisible && selectedCount === 0) return null

  return (
    <>
      {/* 바 */}
      <div
        role="toolbar"
        aria-label={`${selectedCount}개 항목 일괄 작업`}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
          'flex items-center gap-3',
          'px-5 py-3',
          'rounded-[var(--radius-xl)]',
          'bg-[var(--color-surface-raised)]',
          'border border-[var(--color-border)]',
          'shadow-[var(--elevation-e3,0_8px_32px_rgba(0,0,0,0.16))]',
          // 애니메이션
          'transition-all duration-200',
          selectedCount > 0
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none',
          className,
        )}
      >
        {/* 선택 정보 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
            {selectedCount}개 선택됨
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            aria-label="선택 해제"
            className="text-xs text-[var(--color-text-muted)] h-7 px-2"
          >
            해제
          </Button>
        </div>

        {/* 구분선 */}
        <div
          className="w-px h-6 bg-[var(--color-border)] shrink-0"
          role="separator"
          aria-orientation="vertical"
        />

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              size="sm"
              disabled={processingId !== null}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon && (
                <span aria-hidden="true" className="[&_svg]:size-4">
                  {action.icon}
                </span>
              )}
              {action.label}
              {processingId === action.id && (
                <span
                  className="ml-1 animate-spin inline-block size-3 border border-current border-t-transparent rounded-full"
                  aria-hidden="true"
                />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* destructive 확인 모달 */}
      <ConfirmDialog
        open={confirmAction !== null}
        actionLabel={confirmAction?.label ?? ''}
        selectedCount={selectedCount}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            const action = confirmAction
            setConfirmAction(null)
            void executeAction(action)
          }
        }}
      />
    </>
  )
}

BulkActionBar.displayName = 'BulkActionBar'
