import * as React from 'react'

import { cn } from '../utils/cn.js'

/**
 * Card 컴포넌트
 *
 * Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 로 구성.
 * Article/StatCard 베이스로 사용됩니다.
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>제목</CardTitle>
 *     <CardDescription>설명</CardDescription>
 *   </CardHeader>
 *   <CardContent>내용</CardContent>
 *   <CardFooter>
 *     <Button>확인</Button>
 *   </CardFooter>
 * </Card>
 */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)]',
        'border border-[var(--color-border)]',
        'bg-[var(--color-surface-raised)]',
        'shadow-[var(--shadow-sm)]',
        'text-[var(--color-text)]',
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'text-xl font-semibold leading-tight tracking-tight text-[var(--color-text)]',
        className,
      )}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-[var(--color-text-muted)]', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-2 p-6 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
