'use client'

/**
 * Slider 컴포넌트
 *
 * @radix-ui/react-slider 베이스.
 * - 키보드: ←→ 1 스텝, Shift+←→ 10 스텝 (Radix 기본 지원)
 * - 라벨/min/max/step/value/onValueChange/onValueCommit props
 * - 다크모드 자동 (CSS 변수)
 * - prefers-reduced-motion 존중
 * - a11y: aria-label, aria-valuemin/max/now
 *
 * @example
 * <Slider label="투명도" min={0} max={100} step={1} value={opacity} onValueChange={setOpacity} />
 */

import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '../utils/cn.js'

export type SliderProps = {
  /** 라벨 텍스트 (없으면 aria-label 만 사용) */
  label?: string
  min?: number
  max?: number
  step?: number
  /** 단일 값 모드 (배열 첫 번째 요소) */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** 드래그 종료 시점 (commit) */
  onValueCommit?: (value: number) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
  /** 오른쪽에 표시할 단위 (예: '%', '°') */
  unit?: string
}

export const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(
  (
    {
      label,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      disabled = false,
      className,
      unit,
      'aria-label': ariaLabel,
    },
    ref,
  ) => {
    const id = React.useId()

    const handleValueChange = (values: number[]) => {
      if (onValueChange && values[0] !== undefined) onValueChange(values[0])
    }
    const handleValueCommit = (values: number[]) => {
      if (onValueCommit && values[0] !== undefined) onValueCommit(values[0])
    }

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {/* 라벨 + 현재 값 */}
        {(label !== undefined || unit !== undefined) && (
          <div className="flex items-center justify-between">
            {label !== undefined && (
              <label htmlFor={id} className="text-xs text-[var(--color-text-muted)]">
                {label}
              </label>
            )}
            {value !== undefined && (
              <span className="text-xs font-medium text-[var(--color-text)]" aria-hidden="true">
                {value}
                {unit}
              </span>
            )}
          </div>
        )}

        {/* Radix Slider */}
        <SliderPrimitive.Root
          id={id}
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value !== undefined ? [value] : undefined}
          defaultValue={defaultValue !== undefined ? [defaultValue] : undefined}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className={cn(
            'relative flex w-full touch-none select-none items-center',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {/* 트랙 */}
          <SliderPrimitive.Track
            className={cn(
              'relative h-1.5 w-full grow overflow-hidden rounded-full',
              'bg-[var(--color-surface-muted)]',
            )}
          >
            {/* 채워진 범위 */}
            <SliderPrimitive.Range className="absolute h-full bg-[var(--color-brand-500)]" />
          </SliderPrimitive.Track>

          {/* 썸 */}
          <SliderPrimitive.Thumb
            className={cn(
              'block size-4 rounded-full',
              'border-2 border-[var(--color-brand-500)]',
              'bg-[var(--color-surface-raised,white)]',
              'shadow-[var(--shadow-e1,0_1px_2px_rgba(0,0,0,0.12))]',
              'transition-shadow motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
              'cursor-grab active:cursor-grabbing',
              'disabled:pointer-events-none',
            )}
          />
        </SliderPrimitive.Root>
      </div>
    )
  },
)

Slider.displayName = 'Slider'
