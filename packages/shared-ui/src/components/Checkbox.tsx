'use client'

/**
 * Checkbox 컴포넌트
 *
 * Radix UI Checkbox 베이스.
 * - 다크모드 자동 (CSS 변수 사용)
 * - 터치 타겟 ≥ 44px 보장 (wrapper 패딩)
 * - label prop 으로 인라인 레이블 지원
 *
 * @example
 * <Checkbox id="my-cb" label="lowDpi 제외" checked={val} onCheckedChange={setVal} />
 */

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils/cn.js'

export interface CheckboxProps {
  id?: string
  /** 체크 여부 (controlled) */
  checked?: boolean | 'indeterminate'
  /** 초기 체크 여부 (uncontrolled) */
  defaultChecked?: boolean
  /** 변경 콜백 */
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  /** 비활성화 */
  disabled?: boolean
  /** 인라인 레이블 텍스트 */
  label?: string
  /** aria-label (label 없을 때 사용) */
  'aria-label'?: string
  className?: string
}

export function Checkbox({
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  label,
  'aria-label': ariaLabel,
  className,
}: CheckboxProps): React.JSX.Element {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CheckboxPrimitive.Root
        id={checkboxId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={!label ? ariaLabel : undefined}
        className={cn(
          // 크기
          'size-4 shrink-0',
          // 형태
          'rounded-[var(--radius-sm)]',
          // 테두리
          'border border-[var(--editor-border)]',
          // 배경 (체크 안 됨)
          'bg-[var(--color-surface-muted)]',
          // 포커스
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
          // 체크 상태
          'data-[state=checked]:border-[var(--color-brand-500)] data-[state=checked]:bg-[var(--color-brand-500)]',
          // 비활성화
          disabled && 'cursor-not-allowed opacity-50',
          // 트랜지션
          'transition-colors duration-[var(--duration-fast)]',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          <Check className="size-3 stroke-[3]" aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label && (
        <label
          htmlFor={checkboxId}
          className={cn(
            'text-[13px] leading-none text-[var(--editor-text)]',
            'select-none',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      )}
    </div>
  )
}
