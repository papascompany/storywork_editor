'use client'

// ─────────────────────────────────────────────
// EmptyCanvasHint — 사용자 객체 0개일 때 캔버스 중앙 가이드 오버레이
//
// - pointer-events: none → 캔버스 클릭 통과
// - 시스템 객체(kind='background') 는 카운트 제외
// - 사용자 객체 1개 이상이면 자동 사라짐
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { cn } from '@storywork/ui'
import { Command, Sparkles } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

// StoryWork 에서 시스템 객체로 취급할 kind 목록 (카운트 제외)
// kind='background' 는 사용자가 명시 추가하지만 '빈 캔버스' 판단 기준에선 시스템 취급
// → 배경만 있을 때도 hint 노출 (Storige SYSTEM_EXTENSION_TYPES 참고)
const SYSTEM_KINDS = new Set(['__system__'])

type EmptyCanvasHintProps = {
  canvas: StoryCanvas | null
  /** 포즈 도구 활성화 콜백 (M1-08f Command Palette 연동 전 임시) */
  onActivatePoseTool?: () => void
}

function countUserObjects(canvas: StoryCanvas): number {
  try {
    const fabricCanvas = canvas._fabricCanvas
    const objects = fabricCanvas.getObjects()
    return objects.filter((obj) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (obj as any).data as Record<string, unknown> | undefined
      if (!data) return true // data 없는 객체는 사용자 객체로 간주
      const kind = data.kind as string | undefined
      if (kind && SYSTEM_KINDS.has(kind)) return false
      return true
    }).length
  } catch {
    return 0
  }
}

export function EmptyCanvasHint({ canvas, onActivatePoseTool }: EmptyCanvasHintProps) {
  const [isEmpty, setIsEmpty] = useState(true)

  const update = useCallback(() => {
    if (!canvas) {
      setIsEmpty(true)
      return
    }
    setIsEmpty(countUserObjects(canvas) === 0)
  }, [canvas])

  useEffect(() => {
    if (!canvas) {
      setIsEmpty(true)
      return
    }

    update()

    // editor-core 이벤트 구독
    const unsubAdded = canvas.on('object:added', update)
    const unsubRemoved = canvas.on('object:removed', update)

    // fabric 직접 이벤트 (위 이벤트가 발화 전 안전망)
    const fabricCanvas = canvas._fabricCanvas
    fabricCanvas.on('object:added', update)
    fabricCanvas.on('object:removed', update)

    return () => {
      unsubAdded()
      unsubRemoved()
      fabricCanvas.off('object:added', update)
      fabricCanvas.off('object:removed', update)
    }
  }, [canvas, update])

  if (!isEmpty) return null

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-[5]',
        'flex select-none items-center justify-center',
      )}
    >
      <div
        className={cn(
          'flex max-w-[80%] flex-col items-center gap-3 px-6 py-5',
          'rounded-xl border border-[var(--color-border)]',
          'bg-[var(--color-surface-raised)]/80 backdrop-blur-sm',
          'shadow-[var(--elevation-e2,0_2px_8px_rgba(0,0,0,0.08))]',
        )}
      >
        {/* 아이콘 */}
        <Sparkles className="size-6 text-[var(--color-brand-500)]" aria-hidden="true" />

        {/* 텍스트 */}
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">디자인을 시작해보세요</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            왼쪽에서 도구를 선택하거나 빠른 검색을 사용하세요
          </p>
        </div>

        {/* 칩 영역 */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* ⌘K 안내 칩 */}
          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <kbd
              className={cn(
                'inline-flex min-w-[1.25rem] items-center justify-center',
                'h-5 rounded border border-[var(--color-border)]',
                'bg-[var(--color-surface-muted)] px-1.5 font-semibold',
              )}
            >
              <Command className="size-3" aria-hidden="true" />
            </kbd>
            <span className="text-[var(--color-text-muted)]">+</span>
            <kbd
              className={cn(
                'inline-flex min-w-[1.25rem] items-center justify-center',
                'h-5 rounded border border-[var(--color-border)]',
                'bg-[var(--color-surface-muted)] px-1.5 font-semibold',
              )}
            >
              K
            </kbd>
            <span>로 모든 명령 검색</span>
          </div>

          {/* 포즈 추가 칩 — pointer-events 복원 */}
          {onActivatePoseTool && (
            <button
              type="button"
              onClick={onActivatePoseTool}
              className={cn(
                'pointer-events-auto',
                'inline-flex h-6 items-center rounded-full px-3',
                'bg-[var(--color-brand-500)] text-[11px] font-semibold text-white',
                'transition-opacity hover:opacity-90 focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
              )}
            >
              포즈 추가하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
