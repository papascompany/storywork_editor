'use client'

// ─────────────────────────────────────────────
// KeyboardShortcutsModal — ? 키 단축키 도움말
//
// 트리거: ? 키 (input 포커스 아닐 때), TopBar 도움 버튼
// EditorShell 에서 글로벌 keydown 등록 후 open prop 으로 제어.
//
// UI:
// - 화면 가운데 Dialog
// - 카테고리별 단축키 표 (SHORTCUT_GROUPS 공유)
// - 상단 검색창 (단축키/라벨 검색)
// - <kbd> 스타일 단축키 표시
//
// a11y: focus-trap, role=dialog, Esc 닫기, 스크린리더 안내
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { Search, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { SHORTCUT_GROUPS } from './commands/builtins'
import type { ShortcutGroup } from './commands/registry'

// ─── Props ────────────────────────────────────────────────────────────────────

export type KeyboardShortcutsModalProps = {
  open: boolean
  onClose: () => void
}

// ─── KeyCap ──────────────────────────────────────────────────────────────────

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[1.75rem] items-center justify-center',
        'h-6 px-1.5',
        'rounded-[var(--radius-sm)]',
        'border border-[var(--color-border)]',
        'bg-[var(--color-surface-muted)]',
        'text-[11px] font-semibold',
        'text-[var(--color-text)]',
        'shadow-[0_1px_0_var(--color-border)]',
      )}
    >
      {children}
    </kbd>
  )
}

// ─── 단축키 필터 ─────────────────────────────────────────────────────────────

function filterGroups(groups: ShortcutGroup[], query: string): ShortcutGroup[] {
  if (!query.trim()) return groups
  const q = query.toLowerCase().trim()
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.keys.some((k) => k.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.items.length > 0)
}

// ─── KeyboardShortcutsModal ───────────────────────────────────────────────────

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // 열릴 때 초기화 + 포커스
  useEffect(() => {
    if (!open) return
    setQuery('')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [open])

  // Esc 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 필터된 그룹
  const filteredGroups = useMemo(() => filterGroups(SHORTCUT_GROUPS, query), [query])

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 모달 카드 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={cn(
          'fixed left-1/2 top-1/2 z-[301] -translate-x-1/2 -translate-y-1/2',
          'w-[90vw] max-w-[640px]',
          'max-h-[80dvh]',
          'flex flex-col overflow-hidden',
          'rounded-[var(--radius-lg)]',
          'border border-[var(--color-border)]',
          'bg-[var(--color-surface-raised)]',
          'shadow-[0_24px_64px_rgba(0,0,0,0.2)]',
          'motion-reduce:transition-none',
        )}
      >
        {/* 헤더 — px-6 py-4 로 호흡감 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 id="shortcuts-modal-title" className="text-sm font-semibold text-[var(--color-text)]">
            키보드 단축키
          </h2>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            aria-label="단축키 도움말 닫기"
            className={cn(
              'rounded-[var(--radius-sm)] p-1',
              'text-[var(--color-text-muted)]',
              'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* 검색 — px-6 py-3 호흡감 */}
        <div className="shrink-0 border-b border-[var(--color-border)] px-6 py-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              aria-label="단축키 검색"
              placeholder="단축키 또는 설명 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                'flex-1 bg-transparent text-sm text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-muted)]',
                'outline-none',
              )}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* 단축키 목록 — p-6 호흡감 */}
        <div className="flex-1 overflow-y-auto p-6" role="region" aria-label="단축키 목록">
          {filteredGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              일치하는 단축키가 없습니다
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {filteredGroups.map((group) => (
                <section key={group.title} aria-labelledby={`shortcuts-group-${group.title}`}>
                  <h3
                    id={`shortcuts-group-${group.title}`}
                    className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]"
                  >
                    {group.title}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {group.items.map((item, idx) => (
                      <li
                        key={`${group.title}-${idx}`}
                        className="flex items-center justify-between gap-3 py-1"
                      >
                        <span className="text-[13px] text-[var(--color-text)]">
                          {item.description}
                        </span>
                        <span
                          className="flex shrink-0 items-center gap-1"
                          aria-label={`단축키: ${item.keys.join(' + ')}`}
                        >
                          {item.keys.map((k, j) => (
                            <React.Fragment key={j}>
                              {j > 0 && (
                                <span
                                  className="text-[10px] text-[var(--color-text-muted)]"
                                  aria-hidden="true"
                                >
                                  +
                                </span>
                              )}
                              <KeyCap>{k}</KeyCap>
                            </React.Fragment>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 — px-6 py-3.5 로 hairline 위 호흡감 */}
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-3.5">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Windows 에선 <KeyCap>Ctrl</KeyCap> 을 ⌘ 대신 사용하세요. 입력 필드에서는 일부 단축키가
            비활성화됩니다.
          </p>
        </div>
      </div>
    </>
  )
}
