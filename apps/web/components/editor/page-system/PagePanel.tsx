'use client'

/**
 * PagePanel — 다중 페이지 관리 패널
 *
 * - 썸네일 카드 리스트 (세로 스크롤)
 * - 현재 페이지 강조 outline
 * - 카드 클릭 → 페이지 전환
 * - hover ⋯ 메뉴: 복제 / 위로 / 아래로 / 삭제
 * - 하단 "+ 페이지 추가" 버튼
 * - 드래그 순서 변경 (HTML5 native DnD)
 */

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  cn,
} from '@storywork/ui'
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'

import type { PageData } from '../store/usePageStore'
import { usePageStore } from '../store/usePageStore'

// ─── 페이지 카드 ──────────────────────────────────────────────────────────────

interface PageCardProps {
  page: PageData
  pageNumber: number
  isActive: boolean
  isDragging: boolean
  isDragOver: boolean
  onSelect: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent) => void
  canMoveUp: boolean
  canMoveDown: boolean
  canDelete: boolean
}

function PageCard({
  page,
  pageNumber,
  isActive,
  isDragging,
  isDragOver,
  onSelect,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  canMoveUp,
  canMoveDown,
  canDelete,
}: PageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={cn(
        'relative group rounded-[var(--radius-md)]',
        'transition-all duration-[var(--duration-fast)]',
        isDragging && 'opacity-40',
        isDragOver && 'ring-2 ring-[var(--editor-focus)] ring-offset-1',
      )}
      data-testid={`page-card-${page.id}`}
    >
      {/* 썸네일 버튼 */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${pageNumber}페이지로 이동`}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-md)]',
          'border-2 transition-all duration-[var(--duration-fast)]',
          'cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--editor-focus)] focus-visible:ring-offset-2',
          isActive
            ? 'border-[var(--editor-focus)] shadow-md'
            : 'border-[var(--color-border)] hover:border-[var(--editor-border-strong)]',
        )}
        data-testid={`page-card-btn-${page.id}`}
      >
        {/* 썸네일 또는 페이지 번호 placeholder */}
        <div
          className="relative bg-[var(--color-surface-muted)] overflow-hidden"
          style={{ aspectRatio: '3/4' }}
        >
          {page.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.thumbnail}
              alt={`${pageNumber}페이지 썸네일`}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[var(--color-text-muted)] opacity-30">
                {pageNumber}
              </span>
            </div>
          )}

          {/* 현재 페이지 뱃지 */}
          {isActive && (
            <div
              className={cn(
                'absolute top-1.5 left-1.5',
                'rounded-full bg-[var(--editor-accent)]',
                'size-2',
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      {/* 페이지 번호 + ⋯ 메뉴 */}
      <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums font-medium">
          {pageNumber}
        </span>

        {/* ⋯ 드롭다운 (hover 시 또는 menu open 시 노출) */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-6 [&_svg]:size-3',
                'transition-opacity',
                menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              aria-label={`${pageNumber}페이지 메뉴`}
              data-testid={`page-card-menu-${page.id}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onSelect={onDuplicate}
              className="gap-2 text-sm"
              data-testid={`page-menu-duplicate-${page.id}`}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              복제
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onMoveUp}
              disabled={!canMoveUp}
              className="gap-2 text-sm"
              data-testid={`page-menu-move-up-${page.id}`}
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
              위로
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onMoveDown}
              disabled={!canMoveDown}
              className="gap-2 text-sm"
              data-testid={`page-menu-move-down-${page.id}`}
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
              아래로
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              disabled={!canDelete}
              className="gap-2 text-sm text-[var(--color-error-500)]"
              data-testid={`page-menu-delete-${page.id}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── PagePanel ────────────────────────────────────────────────────────────────

export interface PagePanelProps {
  onPageChange?: (index: number) => void
  onPageDelete?: (pageId: string) => void
  className?: string
}

export function PagePanel({ onPageChange, onPageDelete, className }: PagePanelProps) {
  const project = usePageStore((s) => s.project)
  const addPage = usePageStore((s) => s.addPage)
  const removePage = usePageStore((s) => s.removePage)
  const duplicatePage = usePageStore((s) => s.duplicatePage)
  const movePage = usePageStore((s) => s.movePage)
  const setCurrentPage = usePageStore((s) => s.setCurrentPage)

  // DnD 상태
  const dragFromIdx = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleSelect = useCallback(
    (index: number) => {
      setCurrentPage(index)
      onPageChange?.(index)
    },
    [setCurrentPage, onPageChange],
  )

  const handleAddPage = useCallback(() => {
    const afterIndex = project ? project.currentPageIndex : undefined
    addPage({ afterIndex })
    if (project) {
      const newIdx =
        afterIndex !== undefined
          ? Math.min(afterIndex + 1, project.pages.length)
          : project.pages.length
      onPageChange?.(newIdx)
    }
  }, [addPage, project, onPageChange])

  const handleDelete = useCallback(
    (pageId: string) => {
      removePage(pageId)
      onPageDelete?.(pageId)
    },
    [removePage, onPageDelete],
  )

  // DnD 핸들러
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragFromIdx.current = index
    setDraggingIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragFromIdx.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault()
      const fromIndex = dragFromIdx.current
      if (fromIndex !== null && fromIndex !== toIndex) {
        movePage(fromIndex, toIndex)
      }
      dragFromIdx.current = null
      setDraggingIdx(null)
      setDragOverIdx(null)
    },
    [movePage],
  )

  if (!project) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center p-4',
          'text-xs text-[var(--color-text-muted)]',
          className,
        )}
        data-testid="page-panel-empty"
      >
        프로젝트를 먼저 시작하세요
      </div>
    )
  }

  const { pages, currentPageIndex } = project

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden', className)}
      data-testid="page-panel"
      aria-label="페이지 패널"
    >
      {/* 페이지 목록 */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-2 pb-1 space-y-2"
        role="list"
        aria-label="페이지 목록"
      >
        {pages.map((page, idx) => (
          <div role="listitem" key={page.id}>
            <PageCard
              page={page}
              pageNumber={idx + 1}
              isActive={idx === currentPageIndex}
              isDragging={draggingIdx === idx}
              isDragOver={dragOverIdx === idx}
              onSelect={() => handleSelect(idx)}
              onDuplicate={() => duplicatePage(page.id)}
              onMoveUp={() => movePage(idx, idx - 1)}
              onMoveDown={() => movePage(idx, idx + 1)}
              onDelete={() => handleDelete(page.id)}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, idx)}
              canMoveUp={idx > 0}
              canMoveDown={idx < pages.length - 1}
              canDelete={pages.length > 1}
            />
          </div>
        ))}
      </div>

      {/* + 페이지 추가 버튼 */}
      <div className="shrink-0 p-2 border-t border-[var(--color-border)]">
        <Tooltip content="새 페이지 추가 (⌘⇧N)" side="top">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPage}
            className="w-full gap-1.5 text-xs"
            aria-label="새 페이지 추가"
            data-testid="page-add-button"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            페이지 추가
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
