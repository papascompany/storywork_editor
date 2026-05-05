'use client'

// ─────────────────────────────────────────────
// LayerPanel — 레이어 패널 (재작성 M1-08d)
//
// - 트리 표시 (그룹 indent 16px per depth, chevron)
// - 행: 아이콘(kind 별 lucide) + 이름(인라인 더블클릭 편집) + 우측 액션 (lock/hidden/menu)
// - 활성 행: var(--editor-active) 배경
// - 호버 시 우측 액션 표시
// - 메뉴(...) DropdownMenu: 삭제, "맨 앞으로", "한 칸 앞으로", "한 칸 뒤로", "맨 뒤로"
// - 행 클릭 → 캔버스 선택 동기화
// - 빈 상태: 안내 메시지
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import {
  HiddenCommand,
  LockCommand,
  RemoveObjectCommand,
  RenameLayerCommand,
  ZOrderCommand,
  collectHiddenPrevStates,
  collectLockPrevStates,
} from '@storywork/editor-history'
import type { LayerNode, LayerTree } from '@storywork/editor-layers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
  showToast,
} from '@storywork/ui'
import type { FabricObject } from 'fabric'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Image,
  LayoutTemplate,
  Lock,
  LockOpen,
  MessageCircle,
  MoreHorizontal,
  Shapes,
  Sparkles,
  Stars,
  Trash2,
  Type,
  UserSquare2,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { HistoryRef as History } from './types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type LayerPanelProps = {
  layerTree: LayerTree | null
  canvas: StoryCanvas | null
  history: History | null
  selectedIds: string[]
  /** 모바일 BottomSheet 안에서 사용될 때 true */
  isMobile?: boolean
}

// ─── kind → 아이콘 매핑 ───────────────────────────────────────────────────────

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pose: UserSquare2,
  background: Image,
  'mise-en-scene': LayoutTemplate,
  prop: Shapes,
  'speech-bubble': MessageCircle,
  'word-fx': Sparkles,
  decoration: Stars,
  text: Type,
  group: Shapes,
  shape: Shapes,
  frame: LayoutTemplate,
  wordfx: Sparkles,
  bubble: MessageCircle,
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
  shape: '도형',
  frame: '프레임',
  wordfx: '워드효과',
  bubble: '말풍선',
}

// ─── 인라인 이름 편집 ────────────────────────────────────────────────────────

type InlineEditProps = {
  value: string
  onCommit: (name: string) => void
  onCancel: () => void
}

function InlineEdit({ value, onCommit, onCancel }: InlineEditProps) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    else onCancel()
  }

  return (
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
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
        // 행 선택 이벤트가 전파되지 않도록
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
      aria-label="레이어 이름 편집"
      className={cn(
        'h-5 w-full min-w-0 rounded-[var(--radius-sm,2px)] px-1 text-xs',
        'border border-[var(--color-brand-400)]',
        'bg-[var(--color-surface)] text-[var(--color-text)]',
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]',
      )}
    />
  )
}

// ─── 레이어 행 ───────────────────────────────────────────────────────────────

type LayerRowProps = {
  node: LayerNode
  isSelected: boolean
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  onSelect: (id: string) => void
  onToggleLock: (id: string, locked: boolean) => void
  onToggleHidden: (id: string, hidden: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onZOrder: (
    id: string,
    action: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack',
  ) => void
  onToggleExpand: (id: string) => void
}

function LayerRow({
  node,
  isSelected,
  depth,
  isExpanded,
  hasChildren,
  onSelect,
  onToggleLock,
  onToggleHidden,
  onDelete,
  onRename,
  onZOrder,
  onToggleExpand,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false)
  const label = node.name || KIND_LABEL[node.kind] || node.kind
  const KindIcon = KIND_ICON[node.kind] ?? Shapes

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }

  const handleRenameCommit = (name: string) => {
    onRename(node.id, name)
    setEditing(false)
  }

  return (
    <div
      role="row"
      aria-selected={isSelected}
      data-testid={`layer-row-${node.id}`}
      className={cn(
        'group flex h-9 items-center gap-1 text-sm',
        'cursor-pointer select-none',
        'border-b border-[var(--color-border)]',
        'transition-colors motion-reduce:transition-none',
        isSelected
          ? 'bg-[var(--editor-active,var(--color-brand-50))] text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]'
          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]',
        node.hidden && 'opacity-50',
      )}
      style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '4px' }}
      onClick={() => onSelect(node.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(node.id)
        }
      }}
    >
      {/* 그룹 chevron */}
      {hasChildren ? (
        <button
          type="button"
          aria-label={isExpanded ? '그룹 접기' : '그룹 펼치기'}
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(node.id)
          }}
          className="flex size-4 shrink-0 items-center justify-center rounded hover:bg-[var(--color-surface-raised)]"
        >
          <ChevronRight
            className={cn(
              'size-3 transition-transform motion-reduce:transition-none',
              isExpanded && 'rotate-90',
            )}
          />
        </button>
      ) : (
        <span aria-hidden="true" className="size-4 shrink-0" />
      )}

      {/* kind 아이콘 */}
      <KindIcon aria-hidden="true" className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />

      {/* 이름 (더블클릭 → 인라인 편집) */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <InlineEdit
            value={label}
            onCommit={handleRenameCommit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="block truncate text-xs" onDoubleClick={handleDoubleClick} title={label}>
            {label}
          </span>
        )}
      </div>

      {/* 우측 액션 (hover/selected 시 표시) */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5',
          'opacity-0 transition-opacity motion-reduce:transition-none',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          isSelected && 'opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 숨기기 */}
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
          {node.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>

        {/* 잠금 */}
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
          {node.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
        </button>

        {/* 더보기 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="레이어 메뉴"
              className="flex size-6 items-center justify-center rounded hover:bg-[var(--color-surface-raised)]"
            >
              <MoreHorizontal className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left" align="start" className="w-44">
            {/* 복제 (비활성) */}
            <DropdownMenuItem
              disabled
              onSelect={() => showToast('M1-08e 에서 활성화 예정입니다.', 'info')}
            >
              <Copy className="mr-2 size-3.5" />
              복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* z-order */}
            <DropdownMenuItem onSelect={() => onZOrder(node.id, 'bringToFront')}>
              <ArrowUpToLine className="mr-2 size-3.5" />맨 앞으로
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onZOrder(node.id, 'bringForward')}>
              <ArrowUp className="mr-2 size-3.5" />한 칸 앞으로
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onZOrder(node.id, 'sendBackward')}>
              <ArrowDown className="mr-2 size-3.5" />한 칸 뒤로
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onZOrder(node.id, 'sendToBack')}>
              <ArrowDownToLine className="mr-2 size-3.5" />맨 뒤로
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* 삭제 */}
            <DropdownMenuItem
              onSelect={() => onDelete(node.id)}
              className="text-[var(--color-error-600,#e11d48)] focus:text-[var(--color-error-600,#e11d48)]"
            >
              <Trash2 className="mr-2 size-3.5" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── LayerPanel ───────────────────────────────────────────────────────────────

/**
 * LayerPanel (재작성 M1-08d)
 *
 * - LayerTree 이벤트 구독 → 리렌더
 * - 행 클릭 → canvas 선택 동기화
 * - 잠금/숨김/이름 변경/z-order → history 통해 Command push
 * - 빈 상태 안내
 */
export function LayerPanel({
  layerTree,
  canvas,
  history,
  selectedIds,
  isMobile = false,
}: LayerPanelProps) {
  const [nodes, setNodes] = useState<LayerNode[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!layerTree) return

    const refresh = () => {
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

  // ── 선택 ─────────────────────────────────────
  const handleSelect = useCallback(
    (id: string) => {
      if (!canvas) return
      const obj = canvas.getObject(id) as FabricObject | undefined
      if (!obj) return
      canvas._fabricCanvas.setActiveObject(obj)
      canvas._fabricCanvas.requestRenderAll()
    },
    [canvas],
  )

  // ── 잠금 ─────────────────────────────────────
  const handleToggleLock = useCallback(
    (id: string, locked: boolean) => {
      if (!layerTree || !history) return
      const prevStates = collectLockPrevStates(layerTree, id, false)
      const cmd = new LockCommand({ layerTree, id, locked, prevStates })
      history.push(cmd)
    },
    [layerTree, history],
  )

  // ── 숨김 ─────────────────────────────────────
  const handleToggleHidden = useCallback(
    (id: string, hidden: boolean) => {
      if (!layerTree || !history) return
      const prevStates = collectHiddenPrevStates(layerTree, id, false)
      const cmd = new HiddenCommand({ layerTree, id, hidden, prevStates })
      history.push(cmd)
    },
    [layerTree, history],
  )

  // ── 삭제 ─────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      if (!canvas || !history) return
      const fabricObj = canvas.getObject(id) as FabricObject | undefined
      const objectData = canvas.getObjectData(id)
      if (!fabricObj || !objectData) return
      canvas._fabricCanvas.discardActiveObject()
      const cmd = new RemoveObjectCommand({ canvas, id, fabricObj, objectData })
      history.push(cmd)
    },
    [canvas, history],
  )

  // ── 이름 변경 ──────────────────────────────────
  const handleRename = useCallback(
    (id: string, name: string) => {
      if (!layerTree || !history) return
      const node = layerTree.getNode(id)
      const cmd = new RenameLayerCommand({ layerTree, id, prevName: node?.name, nextName: name })
      history.push(cmd)
    },
    [layerTree, history],
  )

  // ── z-order ───────────────────────────────────
  const handleZOrder = useCallback(
    (id: string, action: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack') => {
      if (!layerTree || !history) return
      const node = layerTree.getNode(id)
      if (!node) return
      const siblings = layerTree.getRootNodes().map((n) => n.id)
      const cmd = new ZOrderCommand({
        layerTree,
        id,
        action,
        siblingsBefore: siblings,
        parentId: node.parentId,
      })
      history.push(cmd)
    },
    [layerTree, history],
  )

  // ── 그룹 펼치기 ────────────────────────────────
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── 재귀 렌더 ─────────────────────────────────
  const renderNode = (node: LayerNode, depth: number): React.ReactNode => {
    const hasChildren = node.childrenIds.length > 0
    const isExpanded = expandedIds.has(node.id)

    return (
      <React.Fragment key={node.id}>
        <LayerRow
          node={node}
          isSelected={selectedIds.includes(node.id)}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onSelect={handleSelect}
          onToggleLock={handleToggleLock}
          onToggleHidden={handleToggleHidden}
          onDelete={handleDelete}
          onRename={handleRename}
          onZOrder={handleZOrder}
          onToggleExpand={handleToggleExpand}
        />
        {hasChildren &&
          isExpanded &&
          node.childrenIds
            .map((cid) => layerTree?.getNode(cid))
            .filter((n): n is LayerNode => n !== undefined)
            .map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

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
          <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">레이어가 없습니다</p>
            <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">
              좌측 도구로 추가해보세요
            </p>
          </div>
        ) : (
          nodes.map((node) => renderNode(node, 0))
        )}
      </div>
    </>
  )

  if (isMobile) {
    return <div className="flex h-full flex-col">{innerContent}</div>
  }

  return (
    <div
      aria-label="레이어 패널"
      className={cn('flex flex-col', 'overflow-hidden', 'bg-[var(--color-surface)]')}
    >
      {innerContent}
    </div>
  )
}
