'use client'

// ─────────────────────────────────────────────
// CommandPalette — ⌘K 명령 팔레트
//
// 트리거: ⌘K (Mac) / Ctrl+K (Windows)
// EditorShell 에서 글로벌 keydown 등록 후 open prop 으로 제어.
//
// UI:
// - 화면 가운데 fixed, 너비 640px (모바일 90vw)
// - 상단 검색 input
// - ↑↓ 키 이동, Enter 실행, Esc 닫기
// - 빈 검색 시: 최근 5개 + 추천 7개
//
// a11y: focus-trap, role=combobox, aria-activedescendant
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { Search, X } from 'lucide-react'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { BUILTIN_COMMANDS } from './commands/builtins'
import {
  type Command,
  type CommandContext,
  loadRecentCommandIds,
  saveRecentCommandId,
  searchCommands,
} from './commands/registry'

// ─── Props ────────────────────────────────────────────────────────────────────

export type CommandPaletteProps = {
  open: boolean
  onClose: () => void
  ctx: CommandContext
}

// ─── 카테고리 레이블 ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  tools: '도구',
  edit: '편집',
  layer: '레이어',
  view: '보기',
  file: '파일',
  help: '도움',
}

// 추천 명령 ID (빈 검색 시 노출)
const SUGGESTED_IDS = [
  'tool-pose',
  'tool-background',
  'tool-shape',
  'edit-undo',
  'edit-redo',
  'view-fit',
  'help-shortcuts',
]

// ─── 아이템 렌더 ──────────────────────────────────────────────────────────────

type CommandItemProps = {
  command: Command
  isActive: boolean
  isDisabled: boolean
  id: string
  onClick: () => void
  onMouseEnter: () => void
}

function CommandItem({
  command,
  isActive,
  isDisabled,
  id,
  onClick,
  onMouseEnter,
}: CommandItemProps) {
  const Icon = command.icon
  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5',
        'transition-colors',
        isActive && 'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]',
        !isActive && 'hover:bg-[var(--color-surface-muted)]',
        isDisabled && 'pointer-events-none opacity-40',
      )}
    >
      {/* 아이콘 */}
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
          'border border-[var(--color-border)]',
          'bg-[var(--color-surface)]',
          isActive &&
            'border-[var(--color-brand-300)] bg-[var(--color-brand-100)] dark:border-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]',
        )}
        aria-hidden="true"
      >
        {Icon ? (
          <Icon
            className={cn(
              'size-4',
              isActive
                ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
                : 'text-[var(--color-text-muted)]',
            )}
          />
        ) : (
          <span className="size-4" />
        )}
      </span>

      {/* 라벨 */}
      <span
        className={cn(
          'flex-1 text-sm',
          isActive
            ? 'text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]'
            : 'text-[var(--color-text)]',
        )}
      >
        {command.label}
      </span>

      {/* 단축키 */}
      {command.shortcut && (
        <kbd
          className={cn(
            'hidden sm:inline-flex items-center shrink-0',
            'rounded-[var(--radius-sm)]',
            'border border-[var(--color-border)]',
            'bg-[var(--color-surface-muted)]',
            'px-1.5 py-0.5',
            'text-[10px] font-mono leading-none',
            'text-[var(--color-text-muted)]',
          )}
          aria-label={`단축키: ${command.shortcut}`}
        >
          {command.shortcut}
        </kbd>
      )}
    </div>
  )
}

// ─── CommandPalette (메인) ───────────────────────────────────────────────────

export function CommandPalette({ open, onClose, ctx }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const instanceId = useId()

  // 최근 명령 ID
  const [recentIds, setRecentIds] = useState<string[]>([])

  // open 시 초기화
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIdx(0)
    setRecentIds(loadRecentCommandIds())
    // 검색 input 포커스
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

  // 표시할 명령 목록 계산
  const displayItems = useMemo<Command[]>(() => {
    if (query.trim()) {
      return searchCommands(BUILTIN_COMMANDS, query).map((r) => r.command)
    }
    // 빈 검색: 최근 5개 + 추천 7개 (중복 제거)
    const recentCommands = recentIds
      .slice(0, 5)
      .map((id) => BUILTIN_COMMANDS.find((c) => c.id === id))
      .filter((c): c is Command => !!c)

    const suggested = SUGGESTED_IDS.map((id) => BUILTIN_COMMANDS.find((c) => c.id === id))
      .filter((c): c is Command => !!c)
      .filter((c) => !recentIds.slice(0, 5).includes(c.id))
      .slice(0, 7)

    return [...recentCommands, ...suggested]
  }, [query, recentIds])

  // activeIdx 범위 유지
  useEffect(() => {
    setActiveIdx(0)
  }, [displayItems.length])

  // 명령 실행
  const execute = useCallback(
    (command: Command) => {
      const isDisabled = command.disabled?.(ctx) ?? false
      if (isDisabled) return
      saveRecentCommandId(command.id)
      onClose()
      // 닫힌 후 실행 (포커스 복귀 후)
      requestAnimationFrame(() => {
        void command.action(ctx)
      })
    },
    [ctx, onClose],
  )

  // 키보드 이동/실행
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, displayItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = displayItems[activeIdx]
        if (cmd) execute(cmd)
      }
    },
    [activeIdx, displayItems, execute],
  )

  // 활성 아이템 스크롤
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // 카테고리 그룹핑 (검색 결과)
  const groupedItems = useMemo(() => {
    if (query.trim()) {
      // 검색 결과: 카테고리별 그룹
      const groups = new Map<string, Command[]>()
      displayItems.forEach((cmd) => {
        const cat = cmd.category
        if (!groups.has(cat)) groups.set(cat, [])
        const existing = groups.get(cat)
        if (existing) existing.push(cmd)
      })
      return groups
    }
    // 빈 검색: 단일 그룹
    const groups = new Map<string, Command[]>()
    if (displayItems.length > 0) groups.set('__all', displayItems)
    return groups
  }, [displayItems, query])

  // 전체 인덱스 → 아이템 매핑
  const flatItems = useMemo(() => {
    return [...groupedItems.values()].flat()
  }, [groupedItems])

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 팔레트 카드 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
        className={cn(
          'fixed left-1/2 top-[15vh] z-[301] -translate-x-1/2',
          'w-[90vw] max-w-[640px]',
          'rounded-[var(--radius-lg)]',
          'border border-[var(--color-border)]',
          'bg-[var(--color-surface-raised)]',
          'shadow-[0_24px_64px_rgba(0,0,0,0.2)]',
          'flex flex-col overflow-hidden',
          'motion-reduce:transition-none',
        )}
      >
        {/* 검색 헤더 */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${instanceId}-listbox`}
            aria-activedescendant={
              flatItems[activeIdx] ? `${instanceId}-item-${flatItems[activeIdx].id}` : undefined
            }
            aria-label="명령 검색"
            placeholder="명령 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 bg-transparent text-sm text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'outline-none',
            )}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 결과 목록 */}
        <div
          id={`${instanceId}-listbox`}
          ref={listRef}
          role="listbox"
          aria-label="명령 목록"
          className="max-h-[60vh] overflow-y-auto py-2"
        >
          {flatItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
              일치하는 명령이 없습니다
            </div>
          ) : (
            [...groupedItems.entries()].map(([cat, cmds]) => {
              // 전체 인덱스 오프셋 계산
              const firstCmd = cmds[0]
              const catStartIdx = firstCmd ? flatItems.indexOf(firstCmd) : 0
              return (
                <section key={cat} className="mb-1">
                  {/* 카테고리 헤더 */}
                  {cat !== '__all' && (
                    <div
                      className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </div>
                  )}
                  {!query.trim() && cat === '__all' && (
                    <div
                      className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    >
                      {recentIds.length > 0 ? '최근 및 추천' : '추천'}
                    </div>
                  )}
                  <div className="px-2">
                    {cmds.map((cmd, i) => {
                      const globalIdx = catStartIdx + i
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isActive={activeIdx === globalIdx}
                          isDisabled={cmd.disabled?.(ctx) ?? false}
                          id={`${instanceId}-item-${cmd.id}`}
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}
        </div>

        {/* 푸터 힌트 */}
        <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-2">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1 text-[10px]">
              ↑↓
            </kbd>{' '}
            이동
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1 text-[10px]">
              Enter
            </kbd>{' '}
            실행
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1 text-[10px]">
              Esc
            </kbd>{' '}
            닫기
          </span>
        </div>
      </div>
    </>
  )
}
