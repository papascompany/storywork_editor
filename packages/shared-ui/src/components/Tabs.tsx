'use client'

/**
 * Tabs 컴포넌트
 *
 * @radix-ui/react-tabs 베이스.
 * - 가로 탭, 활성 탭 underline (--color-brand-500 액센트)
 * - 키보드 (←→) 탭 이동 — Radix 기본 지원
 * - 다크모드 자동 (CSS 변수)
 * - a11y: WAI-ARIA tabs 패턴 준수
 * - prefers-reduced-motion 존중
 *
 * @example
 * <Tabs defaultValue="a">
 *   <TabsList>
 *     <TabsTrigger value="a">탭 A</TabsTrigger>
 *     <TabsTrigger value="b">탭 B</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="a">A 내용</TabsContent>
 *   <TabsContent value="b">B 내용</TabsContent>
 * </Tabs>
 */

import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '../utils/cn.js'

// ─── Root ─────────────────────────────────────────────────────────────────────

const Tabs = TabsPrimitive.Root

// ─── List ─────────────────────────────────────────────────────────────────────

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex shrink-0 border-b border-[var(--color-border)]', className)}
      {...props}
    />
  ),
)
TabsList.displayName = 'TabsList'

// ─── Trigger ──────────────────────────────────────────────────────────────────

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>

/**
 * TabsTrigger — 활성 상태 underline 은 ::after 가상 요소 대신
 * Radix data-[state=active] Tailwind arbitrary variant 로 처리한다.
 * 절대 위치 span 을 삽입하는 방식으로 underline 을 구현한다.
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // 레이아웃
      'group relative flex flex-1 items-center justify-center gap-1.5',
      'h-10 px-3 text-sm font-medium',
      // 전환
      'transition-colors motion-reduce:transition-none',
      // 포커스
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
      'focus-visible:ring-[var(--color-brand-500)]',
      // 비활성
      'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
      // 활성
      'data-[state=active]:text-[var(--color-brand-600)] dark:data-[state=active]:text-[var(--color-brand-400)]',
      className,
    )}
    {...props}
  >
    {children}
    {/* 활성 underline 바 — data-[state=active] 부모 아래에서만 표시 */}
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[var(--color-brand-500)]',
        // 비활성 시 숨김 — Tailwind group-data variant
        'hidden group-data-[state=active]:block',
      )}
    />
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = 'TabsTrigger'

// ─── Content ──────────────────────────────────────────────────────────────────

type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'flex-1 overflow-y-auto',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { TabsListProps, TabsTriggerProps, TabsContentProps }
