'use client'

/**
 * ColorPicker 컴포넌트 (단순 팔레트 + hex 입력)
 *
 * - 12색 팔레트 그리드 (브랜드 + 그레이스케일 + 기본색)
 * - "사용자 정의" 클릭 시 hex input + Enter/blur 시 적용
 * - 현재 선택 색은 체크 마크 표시
 * - 다크모드 자동 (CSS 변수)
 * - a11y: role="radiogroup", aria-checked, aria-label
 *
 * @example
 * <ColorPicker value="#6366f1" onChange={setColor} />
 */

import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils/cn.js'

// ─── 기본 팔레트 (12색) ─────────────────────────────────────────────────────────

export const DEFAULT_PALETTE = [
  // 그레이스케일 4
  { label: '흰색', hex: '#ffffff' },
  { label: '밝은 회색', hex: '#e5e7eb' },
  { label: '회색', hex: '#6b7280' },
  { label: '검정', hex: '#111827' },
  // 기본색 4
  { label: '빨강', hex: '#ef4444' },
  { label: '주황', hex: '#f97316' },
  { label: '노랑', hex: '#eab308' },
  { label: '초록', hex: '#22c55e' },
  // 브랜드 + 기타 4
  { label: '파랑', hex: '#3b82f6' },
  { label: '인디고', hex: '#6366f1' },
  { label: '보라', hex: '#a855f7' },
  { label: '핑크', hex: '#ec4899' },
] as const

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type ColorEntry = {
  label: string
  hex: string
}

export type ColorPickerProps = {
  /** 현재 선택 색 (hex 문자열 '#rrggbb') */
  value?: string
  /** 색 선택/변경 시 콜백 */
  onChange?: (hex: string) => void
  /** 팔레트 (기본: DEFAULT_PALETTE 12색) */
  palette?: readonly ColorEntry[]
  className?: string
  /** 사용자 정의 hex 입력 활성 여부 (기본: true) */
  allowCustom?: boolean
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

/**
 * 두 hex 색이 같은지 비교 (대소문자 무시, # 정규화)
 */
function isSameHex(a: string | undefined, b: string): boolean {
  if (!a) return false
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * hex 유효성 검사 (#rrggbb 또는 #rgb)
 */
function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

export function ColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  className,
  allowCustom = true,
}: ColorPickerProps) {
  const [customInput, setCustomInput] = React.useState('')
  const [showCustom, setShowCustom] = React.useState(false)

  // value 가 팔레트에 없는 색이면 custom 활성
  const isCustomActive =
    value !== undefined && !palette.some((c) => isSameHex(value, c.hex)) && value !== ''

  const handlePaletteClick = (hex: string) => {
    setShowCustom(false)
    onChange?.(hex)
  }

  const handleCustomToggle = () => {
    setShowCustom((prev) => !prev)
    if (!showCustom && value) {
      setCustomInput(value)
    }
  }

  const handleCustomCommit = () => {
    const hex = customInput.startsWith('#') ? customInput : `#${customInput}`
    if (isValidHex(hex)) {
      onChange?.(hex)
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomCommit()
      setShowCustom(false)
    }
    if (e.key === 'Escape') {
      setShowCustom(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* 팔레트 그리드 */}
      <div role="radiogroup" aria-label="색상 팔레트" className="grid grid-cols-6 gap-1.5">
        {palette.map((color) => {
          const selected = isSameHex(value, color.hex)
          return (
            <button
              key={color.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              title={color.label}
              onClick={() => handlePaletteClick(color.hex)}
              className={cn(
                'relative size-7 rounded-[var(--radius-sm,4px)]',
                'border transition-transform motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
                selected
                  ? 'border-[var(--color-brand-500)] scale-110'
                  : 'border-[var(--color-border)] hover:scale-105',
              )}
              style={{ backgroundColor: color.hex }}
            >
              {selected && (
                <Check
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 m-auto size-3.5',
                    // 밝은 색 위에서는 어두운 체크, 어두운 색 위에서는 밝은 체크
                    isLightColor(color.hex) ? 'text-[var(--color-text)]' : 'text-white',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 사용자 정의 색상 */}
      {allowCustom && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCustomToggle}
            className={cn(
              'flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm,4px)] px-2',
              'text-xs text-[var(--color-text-muted)]',
              'border border-[var(--color-border)]',
              'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              'transition-colors motion-reduce:transition-none',
            )}
          >
            {/* 현재 커스텀 색 미리보기 */}
            {isCustomActive && value && (
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-sm border border-[var(--color-border)]"
                style={{ backgroundColor: value }}
              />
            )}
            <span>{isCustomActive && value ? value : '사용자 정의'}</span>
          </button>

          {showCustom && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onBlur={handleCustomCommit}
                onKeyDown={handleCustomKeyDown}
                placeholder="#000000"
                maxLength={7}
                aria-label="hex 색상 코드 입력"
                className={cn(
                  'h-7 w-full flex-1 rounded-[var(--radius-sm,4px)] px-2 text-xs',
                  'border border-[var(--color-border)]',
                  'bg-[var(--color-surface)] text-[var(--color-text)]',
                  'placeholder:text-[var(--color-text-muted)]',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]',
                )}
                autoFocus
              />
              {/* 미리보기 */}
              <span
                aria-hidden="true"
                className="size-7 shrink-0 rounded-[var(--radius-sm,4px)] border border-[var(--color-border)]"
                style={{
                  backgroundColor: isValidHex(
                    customInput.startsWith('#') ? customInput : `#${customInput}`,
                  )
                    ? customInput.startsWith('#')
                      ? customInput
                      : `#${customInput}`
                    : 'transparent',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 밝기 판단 헬퍼 ───────────────────────────────────────────────────────────

/**
 * hex 색이 밝은 색인지 판단 (체크마크 색 결정용).
 * W3C 상대 밝기 공식 사용 (YIQ).
 */
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  // YIQ 밝기
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128
}
