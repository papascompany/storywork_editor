'use client'

// ─────────────────────────────────────────────
// FloatingObjectBar — 선택 객체 위 Floating 액션 바 (Canva 풍)
//
// 선택 객체의 BoundingRect 기반 위치 계산 (canvas → DOM 좌표 변환).
// 4 아이콘: Duplicate / Lock / Delete / More(DropdownMenu)
// 객체 이동/리사이즈/회전 중 숨김 (object:moving/scaling/rotating 이벤트).
// 다중 선택: union BoundingRect 위.
// 모바일(md 미만) 숨김.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import {
  AddObjectCommand,
  LockCommand,
  RemoveObjectCommand,
  ZOrderCommand,
  collectLockPrevStates,
} from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  cn,
  showToast,
} from '@storywork/ui'
import type { FabricObject } from 'fabric'
import { Copy, Lock, LockOpen, MoreHorizontal, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { HistoryRef as History } from './types'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type FloatingObjectBarProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
  selectedIds: string[]
  /** 캔버스를 감싸는 컨테이너 DOM ref (위치 계산 기준) */
  canvasWrapperRef: React.RefObject<HTMLDivElement | null>
}

type BarPosition = {
  left: number
  top: number
}

// ─── 위치 계산 헬퍼 ──────────────────────────────────────────────────────────

function getBarPosition(
  canvas: StoryCanvas,
  canvasWrapper: HTMLDivElement,
  selectedIds: string[],
): BarPosition | null {
  if (selectedIds.length === 0) return null

  const fabricCanvas = canvas._fabricCanvas
  const activeObject = fabricCanvas.getActiveObject()
  if (!activeObject) return null

  // union BoundingRect (다중 선택 포함)
  const rect = activeObject.getBoundingRect()

  // fabric viewport transform 적용 (줌/패닝)
  const vt = fabricCanvas.viewportTransform
  const zoom = vt[0] // 균등 스케일 가정
  const panX = vt[4]
  const panY = vt[5]

  // fabric canvas element 의 wrapper 내 오프셋
  const canvasEl = fabricCanvas.getElement()
  const canvasRect = canvasEl.getBoundingClientRect()
  const wrapperRect = canvasWrapper.getBoundingClientRect()

  const canvasOffsetX = canvasRect.left - wrapperRect.left
  const canvasOffsetY = canvasRect.top - wrapperRect.top

  // BoundingRect 는 이미 viewport transform 이 적용된 fabric canvas 내 좌표
  const left = canvasOffsetX + rect.left
  const top = canvasOffsetY + rect.top

  void zoom
  void panX
  void panY

  return { left, top }
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const BAR_HEIGHT = 36 // px
const BAR_OFFSET_ABOVE = 8 // px — 객체 위 여백

export function FloatingObjectBar({
  canvas,
  history,
  layerTree,
  selectedIds,
  canvasWrapperRef,
}: FloatingObjectBarProps) {
  const [pos, setPos] = useState<BarPosition | null>(null)
  const [isTransforming, setIsTransforming] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // 위치 재계산
  const recalcPos = useCallback(() => {
    if (!canvas || !canvasWrapperRef.current || selectedIds.length === 0) {
      setPos(null)
      return
    }
    const p = getBarPosition(canvas, canvasWrapperRef.current, selectedIds)
    setPos(p)
  }, [canvas, canvasWrapperRef, selectedIds])

  // 잠금 상태 동기화
  const syncLockState = useCallback(() => {
    if (!canvas || selectedIds.length !== 1) {
      setIsLocked(false)
      return
    }
    const firstId = selectedIds[0]
    if (!firstId) return
    const node = layerTree?.getNode(firstId)
    setIsLocked(node?.locked ?? false)
  }, [canvas, layerTree, selectedIds])

  // fabric 이벤트 구독
  useEffect(() => {
    if (!canvas) return
    const fabricCanvas = canvas._fabricCanvas

    const startTransform = () => setIsTransforming(true)
    const endTransform = () => {
      setIsTransforming(false)
      recalcPos()
    }

    fabricCanvas.on('object:moving', startTransform)
    fabricCanvas.on('object:scaling', startTransform)
    fabricCanvas.on('object:rotating', startTransform)
    fabricCanvas.on('object:modified', endTransform)
    fabricCanvas.on('selection:updated', recalcPos)
    fabricCanvas.on('after:render', recalcPos)

    recalcPos()
    syncLockState()

    return () => {
      fabricCanvas.off('object:moving', startTransform)
      fabricCanvas.off('object:scaling', startTransform)
      fabricCanvas.off('object:rotating', startTransform)
      fabricCanvas.off('object:modified', endTransform)
      fabricCanvas.off('selection:updated', recalcPos)
      fabricCanvas.off('after:render', recalcPos)
    }
  }, [canvas, recalcPos, syncLockState])

  // selectedIds 변경 시 재계산
  useEffect(() => {
    recalcPos()
    syncLockState()
  }, [selectedIds, recalcPos, syncLockState])

  // ── 핸들러 ──────────────────────────────────────────────────────────────────

  const handleDuplicate = useCallback(async () => {
    if (!canvas || !history || selectedIds.length === 0) return
    const firstId = selectedIds[0]
    if (!firstId) return
    const fabricObj = canvas.getObject(firstId) as FabricObject | null
    if (!fabricObj) return

    try {
      const cloned = await fabricObj.clone()
      cloned.set({
        left: (fabricObj.left ?? 0) + 16,
        top: (fabricObj.top ?? 0) + 16,
      })
      const data = canvas.getObjectData(firstId)
      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: cloned,
        dataOverrides: { kind: data?.kind ?? 'prop' },
      })
      history.push(cmd)
      showToast('복제됨', 'success')
    } catch (err) {
      console.error('[FloatingObjectBar] 복제 실패:', err)
      showToast('복제에 실패했습니다.', 'error')
    }
  }, [canvas, history, selectedIds])

  const handleLock = useCallback(() => {
    if (!canvas || !history || !layerTree || selectedIds.length === 0) return
    const firstId = selectedIds[0]
    if (!firstId) return

    const prevStates = collectLockPrevStates(layerTree, firstId, false)
    const cmd = new LockCommand({
      layerTree,
      id: firstId,
      locked: !isLocked,
      prevStates,
    })
    history.push(cmd)
    setIsLocked((prev) => !prev)
  }, [canvas, history, layerTree, selectedIds, isLocked])

  const handleDelete = useCallback(() => {
    if (!canvas || !history || selectedIds.length === 0) return
    canvas._fabricCanvas.discardActiveObject()
    for (const id of selectedIds) {
      const fabricObj = canvas.getObject(id)
      const objectData = canvas.getObjectData(id)
      if (!fabricObj || !objectData) continue
      const cmd = new RemoveObjectCommand({ canvas, id, fabricObj, objectData })
      history.push(cmd)
    }
  }, [canvas, history, selectedIds])

  const handleZOrder = useCallback(
    (action: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack') => {
      if (!canvas || !history || !layerTree || selectedIds.length === 0) return
      const firstId = selectedIds[0]
      if (!firstId) return

      const parentId = layerTree.getNode(firstId)?.parentId ?? null
      const siblings = parentId
        ? (layerTree.getNode(parentId)?.childrenIds ?? [])
        : layerTree.getRootNodes().map((n) => n.id)

      const cmd = new ZOrderCommand({
        layerTree,
        id: firstId,
        action,
        siblingsBefore: siblings,
        parentId,
      })
      history.push(cmd)
    },
    [canvas, history, layerTree, selectedIds],
  )

  // ── 렌더링 조건 ────────────────────────────────────────────────────────────

  // 변환 중, 선택 없음, 위치 없음이면 숨김
  if (isTransforming || selectedIds.length === 0 || !pos) return null

  // 바 높이 + 여백 만큼 위로 올림. 위가 잘리면 아래에 배치
  const topAbove = pos.top - BAR_HEIGHT - BAR_OFFSET_ABOVE
  const finalTop = topAbove < 0 ? pos.top + BAR_OFFSET_ABOVE + 20 : topAbove

  const isGroup = false // 향후 그룹 지원 시 활성화

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="선택 객체 액션"
      className={cn(
        // 모바일 숨김
        'hidden md:flex',
        'absolute z-[20] items-center gap-0.5',
        'rounded-[var(--radius-md)]',
        'border border-[var(--color-border)]',
        'bg-[var(--color-surface-raised)]',
        'px-1 py-0.5',
        'shadow-[var(--elevation-e2,0_2px_8px_rgba(0,0,0,0.08))]',
      )}
      style={{
        left: pos.left,
        top: finalTop,
        // 최소 너비
        minWidth: 0,
      }}
    >
      {/* Duplicate */}
      <Tooltip content="복제 (⌘D)" side="top">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDuplicate}
          aria-label="복제"
          className="size-7 [&_svg]:size-3.5"
        >
          <Copy aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* Lock */}
      <Tooltip content={isLocked ? '잠금 해제 (⌘L)' : '잠금 (⌘L)'} side="top">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLock}
          aria-label={isLocked ? '잠금 해제' : '잠금'}
          aria-pressed={isLocked}
          className={cn('size-7 [&_svg]:size-3.5', isLocked && 'text-[var(--editor-accent)]')}
        >
          {isLocked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
        </Button>
      </Tooltip>

      {/* Delete */}
      <Tooltip content="삭제 (Del)" side="top">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          aria-label="삭제"
          className="size-7 text-[var(--color-status-error)] [&_svg]:size-3.5 hover:bg-[var(--color-status-error)]/10"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </Tooltip>

      {/* More */}
      <DropdownMenu>
        <Tooltip content="더 보기" side="top">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="더 보기"
              className="size-7 [&_svg]:size-3.5"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onSelect={() => handleZOrder('bringToFront')}>
            맨 앞으로
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleZOrder('bringForward')}>
            한 칸 앞으로
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleZOrder('sendBackward')}>
            한 칸 뒤로
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleZOrder('sendToBack')}>맨 뒤로</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={selectedIds.length < 2 || isGroup}>그룹화</DropdownMenuItem>
          <DropdownMenuItem disabled={!isGroup}>그룹 해제</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
