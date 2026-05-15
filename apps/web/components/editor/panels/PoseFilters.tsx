'use client'

// ─────────────────────────────────────────────
// PoseFilters — 포즈 필터 UI
//
// - bodyType: F/M/child/beast/multi (다중 선택 토글)
// - view: front/side/back/three-quarter (다중 선택 토글)
// - action: 주요 액션 목록 (다중 선택 토글)
// - lowDpi: 체크박스 (false → lowDpi 제외)
// - "초기화" 버튼
// - 접기/펼치기 (아코디언)
// ─────────────────────────────────────────────

import { Checkbox, cn, ToggleGroup, ToggleGroupItem } from '@storywork/ui'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import React, { useCallback, useState } from 'react'

import type { PoseSearchFilters } from './hooks/usePoseSearch'

// ─── 필터 정의 ───────────────────────────────────────────────────────────────

const BODY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'F', label: '여' },
  { value: 'M', label: '남' },
  { value: 'child', label: '아이' },
  { value: 'beast', label: '수인' },
  { value: 'multi', label: '복수' },
]

const VIEW_OPTIONS: { value: string; label: string }[] = [
  { value: 'front', label: '정면' },
  { value: 'side', label: '측면' },
  { value: 'back', label: '후면' },
  { value: 'three-quarter', label: '3/4' },
]

// 주요 액션 목록 (정적, M3+ 에서 facet API 로 교체 예정)
const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'standing', label: '서있음' },
  { value: 'sitting', label: '앉음' },
  { value: 'walking', label: '걸음' },
  { value: 'running', label: '달림' },
  { value: 'fighting', label: '싸움' },
  { value: 'surprised', label: '놀람' },
  { value: 'love', label: '사랑' },
  { value: 'crying', label: '울음' },
  { value: 'laughing', label: '웃음' },
  { value: 'thinking', label: '생각' },
]

// ─── Props ───────────────────────────────────────────────────────────────────

export type PoseFiltersValue = {
  bodyType: string[]
  view: string[]
  action: string[]
  excludeLowDpi: boolean
}

export const INITIAL_FILTERS: PoseFiltersValue = {
  bodyType: [],
  view: [],
  action: [],
  excludeLowDpi: false,
}

export type PoseFiltersProps = {
  value: PoseFiltersValue
  onChange: (next: PoseFiltersValue) => void
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

function isDefaultFilters(v: PoseFiltersValue): boolean {
  return v.bodyType.length === 0 && v.view.length === 0 && v.action.length === 0 && !v.excludeLowDpi
}

function toApiFilters(v: PoseFiltersValue): PoseSearchFilters {
  const f: PoseSearchFilters = {}
  if (v.bodyType.length > 0) f.bodyType = v.bodyType
  if (v.view.length > 0) f.view = v.view
  if (v.action.length > 0) f.action = v.action
  // lowDpi=false → API 에서 lowDpi 자산 제외 (ADR-0011a)
  if (v.excludeLowDpi) f.lowDpi = false
  return f
}

// re-export 변환 함수
export { toApiFilters }

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export function PoseFilters({ value, onChange }: PoseFiltersProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  const isDefault = isDefaultFilters(value)
  const hasActiveFilters = !isDefault

  const handleReset = useCallback(() => {
    onChange(INITIAL_FILTERS)
  }, [onChange])

  const handleBodyTypeChange = useCallback(
    (vals: string[]) => {
      onChange({ ...value, bodyType: vals })
    },
    [onChange, value],
  )

  const handleViewChange = useCallback(
    (vals: string[]) => {
      onChange({ ...value, view: vals })
    },
    [onChange, value],
  )

  const handleActionChange = useCallback(
    (vals: string[]) => {
      onChange({ ...value, action: vals })
    },
    [onChange, value],
  )

  const handleLowDpiChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...value, excludeLowDpi: checked === true })
    },
    [onChange, value],
  )

  return (
    <div className={cn('border-b border-[var(--editor-border)]', 'bg-[var(--editor-panel)]')}>
      {/* 접기/펼치기 헤더 */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="pose-filters-content"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between',
          'px-6 py-3',
          'text-[12px] font-semibold uppercase tracking-wide',
          'text-[var(--editor-text-muted)]',
          'hover:bg-[var(--editor-hover)]',
          'transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
        )}
      >
        <span className="flex items-center gap-1.5">
          필터
          {hasActiveFilters && (
            <span
              aria-label="활성 필터 있음"
              className={cn(
                'inline-flex h-4 w-4 items-center justify-center',
                'rounded-full bg-[var(--color-brand-500)] text-[10px] text-white',
              )}
            >
              {[value.bodyType.length, value.view.length, value.action.length].filter((n) => n > 0)
                .length + (value.excludeLowDpi ? 1 : 0)}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5" aria-hidden="true" />
        )}
      </button>

      {/* 필터 콘텐츠 */}
      <div
        id="pose-filters-content"
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          'motion-reduce:transition-none',
          expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="flex flex-col gap-4 px-6 pb-5 pt-2">
          {/* bodyType */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[var(--editor-text-muted)]">체형</p>
            <ToggleGroup
              type="multiple"
              value={value.bodyType}
              onValueChange={handleBodyTypeChange}
            >
              {BODY_TYPE_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} aria-label={opt.label}>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* view */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[var(--editor-text-muted)]">시점</p>
            <ToggleGroup type="multiple" value={value.view} onValueChange={handleViewChange}>
              {VIEW_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} aria-label={opt.label}>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* action */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[var(--editor-text-muted)]">액션</p>
            <ToggleGroup type="multiple" value={value.action} onValueChange={handleActionChange}>
              {ACTION_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} aria-label={opt.label}>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* lowDpi 체크박스 + 초기화 */}
          <div className="flex items-center justify-between">
            <Checkbox
              checked={value.excludeLowDpi}
              onCheckedChange={handleLowDpiChange}
              label="저해상도 제외"
              aria-label="저해상도(lowDpi) 자산 제외"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                aria-label="필터 초기화"
                className={cn(
                  'flex items-center gap-1 text-[11px] text-[var(--color-brand-500)]',
                  'hover:text-[var(--color-brand-600)] hover:underline',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]',
                )}
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                초기화
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
