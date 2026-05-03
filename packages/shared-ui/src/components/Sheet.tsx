'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils/cn.js'

/**
 * Sheet 컴포넌트 (슬라이드 패널 / BottomSheet)
 *
 * Radix Dialog 기반으로 구현. side prop 으로 방향 조절:
 * - top/bottom: 모바일 BottomSheet 용도
 * - left/right: 데스크톱 사이드 패널 용도
 *
 * 키보드 탐색, 포커스 트랩, ESC 닫기 자동 지원.
 *
 * @example
 * // 모바일 BottomSheet
 * <Sheet>
 *   <SheetTrigger asChild>
 *     <Button>패널 열기</Button>
 *   </SheetTrigger>
 *   <SheetContent side="bottom">
 *     <SheetHeader>
 *       <SheetTitle>레이어</SheetTitle>
 *     </SheetHeader>
 *     <p>패널 내용</p>
 *   </SheetContent>
 * </Sheet>
 */

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      'bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

type SheetSide = 'top' | 'right' | 'bottom' | 'left'

const sheetSideVariants: Record<SheetSide, string> = {
  top: cn(
    'inset-x-0 top-0',
    'border-b border-[var(--color-border)]',
    'rounded-b-[var(--radius-xl)]',
    'data-[state=open]:slide-in-from-top',
    'data-[state=closed]:slide-out-to-top',
  ),
  bottom: cn(
    'inset-x-0 bottom-0',
    'max-h-[85dvh]',
    'border-t border-[var(--color-border)]',
    'rounded-t-[var(--radius-xl)]',
    'data-[state=open]:slide-in-from-bottom',
    'data-[state=closed]:slide-out-to-bottom',
  ),
  left: cn(
    'inset-y-0 left-0',
    'h-full w-80 max-w-[90vw]',
    'border-r border-[var(--color-border)]',
    'data-[state=open]:slide-in-from-left',
    'data-[state=closed]:slide-out-to-left',
  ),
  right: cn(
    'inset-y-0 right-0',
    'h-full w-80 max-w-[90vw]',
    'border-l border-[var(--color-border)]',
    'data-[state=open]:slide-in-from-right',
    'data-[state=closed]:slide-out-to-right',
  ),
}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: SheetSide
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50',
        'bg-[var(--color-surface-raised)]',
        'shadow-[var(--shadow-xl)]',
        'overflow-y-auto',
        'focus:outline-none',
        'transition ease-[var(--easing-default)]',
        'duration-[var(--duration-slow)]',
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        sheetSideVariants[side],
        className,
      )}
      {...props}
    >
      {/* BottomSheet 드래그 핸들 (bottom/top) */}
      {(side === 'bottom' || side === 'top') && (
        <div
          className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-[var(--color-border)]"
          aria-hidden="true"
        />
      )}

      {/* Radix 접근성: aria-describedby 기본 처리 */}
      <DialogPrimitive.Description className="sr-only">시트 패널</DialogPrimitive.Description>

      {children}

      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4',
          'size-8 rounded-[var(--radius-sm)]',
          'flex items-center justify-center',
          'text-[var(--color-text-muted)]',
          'opacity-70 transition-opacity hover:opacity-100',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-2',
          'ring-offset-[var(--color-surface-raised)]',
          'disabled:pointer-events-none',
        )}
        aria-label="닫기"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 px-6 pt-4 pb-2', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 px-6 py-4', 'sm:flex-row sm:justify-end', className)}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-[var(--color-text)]', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-text-muted)]', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
