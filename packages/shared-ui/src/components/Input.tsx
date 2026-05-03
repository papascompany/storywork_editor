import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../utils/cn.js'

/**
 * Input 컴포넌트
 *
 * - 에러/기본 variant
 * - 44px 최소 높이 (h-11)
 * - label + helperText + errorText 지원
 * - forwardRef
 *
 * @example
 * <Input label="이메일" type="email" placeholder="user@example.com" />
 * <Input label="비밀번호" variant="error" errorText="8자 이상 입력하세요" />
 */

const inputVariants = cva(
  [
    'flex w-full h-11',
    'rounded-[var(--radius-md)]',
    'border bg-[var(--color-surface)]',
    'px-3 py-2',
    'text-base text-[var(--color-text)]',
    'placeholder:text-[var(--color-text-disabled)]',
    'transition-colors duration-[var(--duration-fast)]',
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-surface)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    // 파일 입력 기본 스타일
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'file:text-[var(--color-text)]',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-[var(--color-border)]',
          'focus-visible:ring-[var(--color-brand-500)]',
          'focus-visible:border-[var(--color-border-focus)]',
        ],
        error: ['border-[var(--color-error-500)]', 'focus-visible:ring-[var(--color-error-500)]'],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {
  /** 레이블 텍스트 */
  label?: string
  /** 도움말 텍스트 */
  helperText?: string
  /** 에러 메시지 (variant="error" 와 함께 사용) */
  errorText?: string
  /** 입력 필드 앞에 올 아이콘/내용 */
  startAdornment?: React.ReactNode
  /** 입력 필드 뒤에 올 아이콘/내용 */
  endAdornment?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      label,
      helperText,
      errorText,
      startAdornment,
      endAdornment,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const id = idProp ?? generatedId
    const hasError = variant === 'error' || Boolean(errorText)
    const effectiveVariant = hasError ? 'error' : (variant ?? 'default')
    const descId = (helperText ?? errorText) ? `${id}-desc` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}

        {(startAdornment ?? endAdornment) ? (
          <div className="relative flex items-center">
            {startAdornment && (
              <span className="absolute left-3 flex items-center text-[var(--color-text-muted)] [&_svg]:size-4">
                {startAdornment}
              </span>
            )}
            <input
              ref={ref}
              id={id}
              aria-describedby={descId}
              aria-invalid={hasError ? 'true' : undefined}
              className={cn(
                inputVariants({ variant: effectiveVariant }),
                startAdornment && 'pl-9',
                endAdornment && 'pr-9',
                className,
              )}
              {...props}
            />
            {endAdornment && (
              <span className="absolute right-3 flex items-center text-[var(--color-text-muted)] [&_svg]:size-4">
                {endAdornment}
              </span>
            )}
          </div>
        ) : (
          <input
            ref={ref}
            id={id}
            aria-describedby={descId}
            aria-invalid={hasError ? 'true' : undefined}
            className={cn(inputVariants({ variant: effectiveVariant }), className)}
            {...props}
          />
        )}

        {(helperText ?? errorText) && (
          <p
            id={descId}
            className={cn(
              'text-xs',
              hasError ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
            role={hasError ? 'alert' : undefined}
          >
            {errorText ?? helperText}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input, inputVariants }
