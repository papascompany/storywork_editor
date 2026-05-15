'use client'

/**
 * Tooltip 컴포넌트
 *
 * Radix UI Tooltip 베이스.
 * - 다크모드 자동
 * - shortcut prop으로 단축키 표시 (kbd 스타일)
 * - delay 200ms, 빠른 호버 시 즉시 전환 (skipDelayDuration 0)
 * - 터치 타겟 ≥ 44px 를 trigger 컴포넌트가 보장해야 합니다
 *
 * @example
 * <Tooltip content="실행 취소" shortcut="Cmd+Z">
 *   <Button size="icon" aria-label="실행 취소"><Undo /></Button>
 * </Tooltip>
 *
 * <Tooltip content="저장" side="bottom">
 *   <Button>저장</Button>
 * </Tooltip>
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '../utils/cn.js'

export interface TooltipProps {
  /** 툴팁 내용 */
  content: React.ReactNode
  /** 표시 방향. 기본값 'top' */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** trigger 과의 간격(px). 기본값 6 */
  sideOffset?: number
  /** 단축키 표시 (예: "Cmd+Z"). kbd 스타일로 우측에 표시 */
  shortcut?: string
  /** trigger 요소 (단일 ReactElement) */
  children: React.ReactElement
}

/**
 * TooltipProvider 는 앱 루트에서 한 번 마운트하거나, Tooltip 내부에서 자동 처리합니다.
 * delayDuration / skipDelayDuration 전역 설정이 필요하면 root layout에 TooltipProvider를 추가하세요.
 */
export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  side = 'top',
  sideOffset = 6,
  shortcut,
  children,
}: TooltipProps): React.JSX.Element {
  return (
    // Provider 를 각 Tooltip에 감싸면 독립 동작. 앱 루트에 전역 Provider가 있으면 이 Provider는 무시됩니다.
    <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            collisionPadding={16}
            avoidCollisions
            className={cn(
              // 레이아웃
              'inline-flex items-center gap-2',
              'max-w-[280px]',
              // 타이포
              'text-xs font-medium',
              // 색상 — CSS 변수 사용
              'text-[var(--color-text-inverse)]',
              'bg-[var(--color-text)]',
              // 형태
              'rounded-[var(--radius-sm)]',
              'px-2.5 py-1.5',
              // 그림자
              'shadow-[var(--elevation-e3,0_4px_16px_rgba(0,0,0,0.12))]',
              // 애니메이션 (prefers-reduced-motion 전역 가드가 처리)
              'animate-in fade-in-0 zoom-in-95 duration-[var(--duration-fast)]',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2',
              'data-[side=left]:slide-in-from-right-2',
              'data-[side=right]:slide-in-from-left-2',
              // z-index
              'z-[90]',
            )}
          >
            <span>{content}</span>

            {shortcut && (
              <kbd
                className={cn(
                  'inline-flex items-center',
                  'rounded-[var(--radius-sm)]',
                  'border border-[var(--color-text-muted)]',
                  'bg-[var(--color-text)] opacity-70',
                  'px-1 py-0.5',
                  'text-[10px] font-mono leading-none',
                  'text-[var(--color-text-inverse)]',
                )}
              >
                {shortcut}
              </kbd>
            )}

            <TooltipPrimitive.Arrow className="fill-[var(--color-text)]" width={8} height={4} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
