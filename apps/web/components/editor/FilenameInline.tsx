'use client'

// ─────────────────────────────────────────────
// FilenameInline — 파일명 인라인 편집 컴포넌트
// 클릭 시 input 으로 전환, blur/Enter 저장, 빈 값 시 "제목 없음" placeholder
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { FileText } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export type FilenameInlineProps = {
  value: string
  onChange: (newName: string) => void
  className?: string
}

export function FilenameInline({ value, onChange, className }: FilenameInlineProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // 외부 value 변경 시 draft 동기화 (편집 중엔 무시)
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const startEdit = useCallback(() => {
    setDraft(value)
    setEditing(true)
  }, [value])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    const final = trimmed.length > 0 ? trimmed : '제목 없음'
    setEditing(false)
    setDraft(final)
    onChange(final)
  }, [draft, onChange])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(value)
  }, [value])

  // 편집 시작 시 input 포커스 + 전체 선택
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <div className={cn('flex min-w-0 items-center gap-1', className)}>
        <FileText className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancel()
            }
          }}
          className={cn(
            // 레이아웃
            'min-w-0 flex-1',
            // 모양
            'rounded-[var(--radius-sm)]',
            'border border-[var(--color-brand-500)]',
            'bg-[var(--color-surface)]',
            'px-1.5 py-0.5',
            // 타이포
            'text-sm font-medium text-[var(--color-text)]',
            // 포커스
            'outline-none ring-2 ring-[var(--color-brand-500)] ring-offset-1',
            'ring-offset-[var(--color-surface)]',
            // 너비 제한
            'max-w-[200px] md:max-w-[280px]',
          )}
          aria-label="파일명 편집"
          maxLength={80}
          data-testid="filename-input"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      aria-label={`파일명: ${value}. 클릭하여 편집`}
      className={cn(
        'flex min-w-0 items-center gap-1',
        'cursor-pointer',
        'rounded-[var(--radius-sm)]',
        'px-1.5 py-0.5',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-[var(--color-surface-muted)]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-1',
        'focus-visible:ring-offset-[var(--color-surface)]',
        className,
      )}
      data-testid="filename-button"
    >
      <FileText className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
      <span
        className="max-w-[120px] truncate text-sm font-medium text-[var(--color-text)] md:max-w-[200px]"
        title={value}
      >
        {value || '제목 없음'}
      </span>
    </button>
  )
}
