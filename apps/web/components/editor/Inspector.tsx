'use client'

// ─────────────────────────────────────────────
// Inspector — 우측 속성 패널 (위치/크기/회전, mm 단위)
// ─────────────────────────────────────────────

import { cn, Input } from '@storywork/ui'
import React, { useCallback } from 'react'

import type { ObjectProps } from './hooks/useSelection'

type InspectorProps = {
  props: ObjectProps | null
  onUpdate: (patch: Partial<Omit<ObjectProps, 'id'>>) => void
  /** 모바일 BottomSheet 안에서 사용될 때 true — inputMode, 패딩 조정 */
  isMobile?: boolean
}

type NumberInputProps = {
  label: string
  unit?: string
  value: number
  onCommit: (v: number) => void
  step?: number
  /** 모바일 키패드 최적화 — decimal 키패드로 소수점 입력 허용 */
  isMobile?: boolean
  'aria-label'?: string
}

function NumberInput({
  label,
  unit = 'mm',
  value,
  onCommit,
  step = 1,
  isMobile = false,
  ...rest
}: NumberInputProps) {
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value)
      if (!isNaN(v)) onCommit(v)
    },
    [onCommit],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const v = parseFloat((e.target as HTMLInputElement).value)
        if (!isNaN(v)) onCommit(v)
      }
    },
    [onCommit],
  )

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--color-text-muted)]">{label}</label>
      <div className="relative flex items-center">
        <Input
          type="number"
          step={step}
          defaultValue={Math.round(value * 10) / 10}
          key={`${value}`}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={rest['aria-label'] ?? label}
          className="h-8 w-full pr-8 text-sm"
          // 모바일: decimal 키패드로 소수점 허용 (키패드 최소화)
          inputMode={isMobile ? 'decimal' : undefined}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 text-xs text-[var(--color-text-muted)]">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export function Inspector({ props, onUpdate, isMobile = false }: InspectorProps) {
  // 모바일 BottomSheet 안에서는 aside 컨테이너를 감싸지 않고 콘텐츠만 반환
  const content = (
    <>
      {!isMobile && (
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">속성</h2>
        </div>
      )}

      {props === null ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
          객체를 선택하면 속성이 표시됩니다
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {/* 위치 */}
          <section aria-label="위치">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              위치
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="X"
                value={props.x}
                onCommit={(v) => onUpdate({ x: v })}
                aria-label="X 위치 (mm)"
                isMobile={isMobile}
              />
              <NumberInput
                label="Y"
                value={props.y}
                onCommit={(v) => onUpdate({ y: v })}
                aria-label="Y 위치 (mm)"
                isMobile={isMobile}
              />
            </div>
          </section>

          {/* 크기 */}
          <section aria-label="크기">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              크기
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="너비"
                value={props.width}
                onCommit={(v) => onUpdate({ width: v })}
                aria-label="너비 (mm)"
                isMobile={isMobile}
              />
              <NumberInput
                label="높이"
                value={props.height}
                onCommit={(v) => onUpdate({ height: v })}
                aria-label="높이 (mm)"
                isMobile={isMobile}
              />
            </div>
          </section>

          {/* 회전 */}
          <section aria-label="회전">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              회전
            </h3>
            <NumberInput
              label="각도"
              unit="°"
              step={0.1}
              value={props.angle}
              onCommit={(v) => onUpdate({ angle: v })}
              aria-label="회전 각도 (도)"
              isMobile={isMobile}
            />
          </section>
        </div>
      )}
    </>
  )

  if (isMobile) {
    // 모바일: 순수 콘텐츠만 (BottomSheet 가 aside 역할)
    return <div className="flex flex-col">{content}</div>
  }

  return (
    <aside
      aria-label="속성 패널"
      className={cn(
        'hidden md:flex',
        'w-[280px] shrink-0 flex-col gap-0 border-l border-[var(--color-border)]',
        'bg-[var(--color-surface)]',
        'overflow-y-auto',
      )}
    >
      {content}
    </aside>
  )
}
