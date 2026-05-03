import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../utils/cn.js'

/**
 * Button 컴포넌트
 *
 * - WCAG 2.1 AA: 최소 44×44px 터치 타겟 (md 기준 h-11)
 * - forwardRef + Slot(asChild) 지원
 * - variants: default/secondary/ghost/outline/destructive
 * - sizes: sm/md/lg/icon
 *
 * @example
 * <Button variant="default" size="md">저장</Button>
 * <Button variant="outline" size="sm" asChild>
 *   <a href="/edit">편집</a>
 * </Button>
 */

const buttonVariants = cva(
  // base
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium whitespace-nowrap',
    'rounded-[var(--radius-md)]',
    'transition-colors',
    'duration-[var(--duration-fast)]',
    'cursor-pointer select-none',
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--color-surface)]',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--color-brand-500)] text-[var(--color-text-inverse)]',
          'hover:bg-[var(--color-brand-600)]',
          'active:bg-[var(--color-brand-700)]',
        ],
        secondary: [
          'bg-[var(--color-surface-raised)] text-[var(--color-text)]',
          'border border-[var(--color-border)]',
          'hover:bg-[var(--color-surface-muted)]',
        ],
        ghost: ['bg-transparent text-[var(--color-text)]', 'hover:bg-[var(--color-surface-muted)]'],
        outline: [
          'bg-transparent text-[var(--color-brand-500)]',
          'border border-[var(--color-brand-500)]',
          'hover:bg-[var(--color-brand-50)] dark:hover:bg-[var(--color-brand-950)]',
        ],
        destructive: [
          'bg-[var(--color-error-500)] text-[var(--color-text-inverse)]',
          'hover:bg-[var(--color-error-600)]',
        ],
        unstyled: [],
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-4 text-base [&_svg]:size-5', // 44px 터치 타겟
        lg: 'h-12 px-6 text-lg [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5', // 정사각 아이콘 버튼 44×44
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** true 이면 첫 번째 자식 요소를 루트 요소로 렌더 (Radix Slot) */
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
