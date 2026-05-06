'use client'

/**
 * ToggleGroup 컴포넌트
 *
 * Radix UI ToggleGroup 베이스.
 * - 단일 선택(single) / 다중 선택(multiple) 지원
 * - 다크모드 자동 (CSS 변수)
 * - 터치 타겟 ≥ 44px (variant='pill' 기본)
 *
 * @example
 * // 다중 선택
 * <ToggleGroup type="multiple" value={vals} onValueChange={setVals}>
 *   <ToggleGroupItem value="F">여</ToggleGroupItem>
 *   <ToggleGroupItem value="M">남</ToggleGroupItem>
 * </ToggleGroup>
 *
 * // 단일 선택
 * <ToggleGroup type="single" value={val} onValueChange={setVal}>
 *   <ToggleGroupItem value="front">정면</ToggleGroupItem>
 * </ToggleGroup>
 */

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import * as React from 'react'

import { cn } from '../utils/cn.js'

// ─── ToggleGroup ─────────────────────────────────────────────────────────────

type ToggleGroupSingleProps = {
  type: 'single'
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

type ToggleGroupMultipleProps = {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type ToggleGroupProps = (ToggleGroupSingleProps | ToggleGroupMultipleProps) & {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  /** 버튼 사이 gap. 기본 1 */
  gap?: 'none' | 'xs' | 'sm'
}

const GAP_CLASS: Record<NonNullable<ToggleGroupProps['gap']>, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-1.5',
}

export function ToggleGroup({
  children,
  className,
  disabled,
  gap = 'xs',
  ...props
}: ToggleGroupProps): React.JSX.Element {
  return (
    <ToggleGroupPrimitive.Root
      {...(props as React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>)}
      disabled={disabled}
      className={cn('flex flex-wrap', GAP_CLASS[gap], className)}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

// ─── ToggleGroupItem ──────────────────────────────────────────────────────────

export interface ToggleGroupItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function ToggleGroupItem({
  value,
  children,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ToggleGroupItemProps): React.JSX.Element {
  return (
    <ToggleGroupPrimitive.Item
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        // 기본 레이아웃
        'inline-flex items-center justify-center',
        'min-h-[28px] px-2.5 py-1',
        // 타이포
        'text-[12px] font-medium',
        // 형태
        'rounded-[var(--radius-sm)]',
        // 색상 (기본)
        'border border-[var(--editor-border)]',
        'bg-[var(--color-surface-muted)]',
        'text-[var(--editor-text-muted)]',
        // hover
        'hover:bg-[var(--editor-hover)] hover:text-[var(--editor-text)]',
        // 선택 상태
        'data-[state=on]:border-[var(--color-brand-500)]',
        'data-[state=on]:bg-[var(--color-brand-500)]/15',
        'data-[state=on]:text-[var(--color-brand-600)]',
        // 포커스
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
        // 비활성화
        disabled && 'cursor-not-allowed opacity-50',
        // 트랜지션
        'transition-colors duration-[var(--duration-fast)]',
        className,
      )}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}
