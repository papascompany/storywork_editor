'use client'

// ─────────────────────────────────────────────
// LayerPanel — 하단 레이어 패널
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerNode, LayerTree } from '@storywork/editor-layers'
import { cn } from '@storywork/ui'
import { Eye, EyeOff, Lock, LockOpen, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

type LayerPanelProps = {
  layerTree: LayerTree | null
  canvas: StoryCanvas | null
  selectedIds: string[]
  /** 모바일 BottomSheet 안에서 사용될 때 true — aside 컨테이너 없이 콘텐츠만 */
  isMobile?: boolean
}

const KIND_LABEL: Record<string, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
  text: '텍스트',
  group: '그룹',
}

type LayerRowProps = {
  node: LayerNode
  isSelected: boolean
  depth: number
  onSelect: (id: string) => void
  onToggleLock: (id: string, locked: boolean) => void
  onToggleHidden: (id: string, hidden: boolean) => void
  onDelete: (id: string) => void
}

function LayerRow({
  node,
  isSelected,
  depth,
  onSelect,
  onToggleLock,
  onToggleHidden,
  onDelete,
}: LayerRowProps) {
  const label = node.name ?? KIND_LABEL[node.kind] ?? node.kind

  return (
    <div
      role="row"
      aria-selected={isSelected}
      className={cn(
        'group flex h-9 items-center gap-1 px-2 text-sm',
        'cursor-pointer select-none',
        'border-b border-[var(--color-border)]',
        'transition-colors',
        isSelected
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-300)]'
          : 'hover:bg-[var(--color-surface-muted)] text-[var(--color-text)]',
        node.hidden && 'opacity-50',
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => onSelect(node.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.id)
        }
      }}
    >
      {/* 레이어 이름 */}
      <span className="flex-1 truncate">{label}</span>

      {/* 액션 버튼 (hover/focus 시 표시) */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {/* 숨기기 토글 */}
        <button
          type="button"
          aria-label={node.hidden ? '표시' : '숨기기'}
          aria-pressed={node.hidden}
          onClick={(e) => {
            e.stopPropagation()
            onToggleHidden(node.id, !node.hidden)
          }}
          className="flex size-6 items-center justify-center rounded hover:bg-[var(--color-surface-raised)]"
        >
          {node.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>

        {/* 잠금 토글 */}
        <button
          type="button"
          aria-label={node.locked ? '잠금 해제' : '잠금'}
          aria-pressed={node.locked}
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock(node.id, !node.locked)
          }}
          className="flex size-6 items-center justify-center rounded hover:bg-[var(--color-surface-raised)]"
        >
          {node.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </button>

        {/* 삭제 */}
        <button
          type="button"
          aria-label="레이어 삭제"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node.id)
          }}
          className="flex size-6 items-center justify-center rounded hover:bg-[var(--color-error-50,#fef2f2)] hover:text-[var(--color-error-600,#dc2626)]"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/**
 * LayerPanel
 *
 * - LayerTree.on('tree:changed' | 'state:changed') 를 구독해 리렌더
 * - 클릭 → canvas selection 연동
 * - 잠금/숨김 토글 → LayerTree 상태 변경 → fabric 동기화
 * - 삭제 → canvas.removeObject
 */
export function LayerPanel({ layerTree, canvas, selectedIds, isMobile = false }: LayerPanelProps) {
  const [nodes, setNodes] = useState<LayerNode[]>([])

  useEffect(() => {
    if (!layerTree) return

    const refresh = () => {
      // root 노드 역순 (최상위 z-order 가 화면 위)
      setNodes([...layerTree.getRootNodes()].reverse())
    }

    refresh()

    const unsubTree = layerTree.on('tree:changed', refresh)
    const unsubState = layerTree.on('state:changed', refresh)

    return () => {
      unsubTree()
      unsubState()
    }
  }, [layerTree])

  const handleSelect = useCallback(
    (id: string) => {
      if (!canvas) return
      const obj = canvas.getObject(id)
      if (!obj) return
      canvas._fabricCanvas.setActiveObject(obj)
      canvas._fabricCanvas.requestRenderAll()
    },
    [canvas],
  )

  const handleToggleLock = useCallback(
    (id: string, locked: boolean) => {
      layerTree?.setLock(id, locked)
    },
    [layerTree],
  )

  const handleToggleHidden = useCallback(
    (id: string, hidden: boolean) => {
      layerTree?.setHidden(id, hidden)
    },
    [layerTree],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (!canvas) return
      canvas._fabricCanvas.discardActiveObject()
      canvas.removeObject(id)
    },
    [canvas],
  )

  const innerContent = (
    <>
      {/* 헤더 */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          레이어
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">{nodes.length}개</span>
      </div>

      {/* 레이어 목록 */}
      <div
        role="grid"
        aria-label="레이어 목록"
        aria-rowcount={nodes.length}
        className="flex-1 overflow-y-auto"
      >
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
            레이어가 없습니다
          </div>
        ) : (
          nodes.map((node) => (
            <LayerRow
              key={node.id}
              node={node}
              isSelected={selectedIds.includes(node.id)}
              depth={0}
              onSelect={handleSelect}
              onToggleLock={handleToggleLock}
              onToggleHidden={handleToggleHidden}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </>
  )

  if (isMobile) {
    return <div className="flex h-full flex-col">{innerContent}</div>
  }

  return (
    <aside
      aria-label="레이어 패널"
      className={cn(
        'hidden md:flex md:flex-col',
        'h-[200px] shrink-0 border-t border-[var(--color-border)]',
        'bg-[var(--color-surface)]',
        'overflow-hidden',
      )}
    >
      {innerContent}
    </aside>
  )
}
