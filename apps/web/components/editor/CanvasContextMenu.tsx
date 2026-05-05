'use client'

// ─────────────────────────────────────────────
// CanvasContextMenu — 우클릭 컨텍스트 메뉴
//
// 빈 공간 우클릭: 붙여넣기(disabled) / 전체 선택 / 구분선 / 줌 4종
// 객체 우클릭: 복제 / 잠금 토글 / 숨김 토글 / 구분선 / z-order 4종 / 구분선 / 삭제
//
// 포지션: 클릭 좌표 기준 (Radix DropdownMenu 가 trigger 기반이므로
//   고정 크기 1×1 invisible trigger 를 클릭 좌표에 배치).
// 키보드: Esc 닫기, Tab 순환 (Radix 기본 지원).
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import {
  AddObjectCommand,
  HiddenCommand,
  LockCommand,
  RemoveObjectCommand,
  ZOrderCommand,
  collectHiddenPrevStates,
  collectLockPrevStates,
} from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  showToast,
} from '@storywork/ui'
import type { FabricObject } from 'fabric'
import { ActiveSelection } from 'fabric'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { applyZoom, fitToViewport, getZoomPercent, MAX_ZOOM, MIN_ZOOM } from './Footer'
import type { HistoryRef as History } from './types'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type MenuState = {
  x: number
  y: number
  open: boolean
  /** 우클릭한 객체 id (없으면 빈 공간) */
  targetId: string | null
}

type CanvasContextMenuProps = {
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
  /** 캔버스 wrapper div ref (좌표 기준) */
  canvasWrapperRef: React.RefObject<HTMLDivElement | null>
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export function CanvasContextMenu({
  canvas,
  history,
  layerTree,
  canvasWrapperRef,
}: CanvasContextMenuProps) {
  const [menu, setMenu] = useState<MenuState>({ x: 0, y: 0, open: false, targetId: null })
  const triggerRef = useRef<HTMLDivElement>(null)

  // ── 우클릭 이벤트 수신 (wrapper onContextMenu 에서 호출) ─────────────────
  // EditorCanvas 가 onContextMenu={openMenu} 를 통해 이 컴포넌트를 호출한다.
  // 이 컴포넌트는 open 상태를 직접 제어한다.

  const openMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      if (!canvas || !canvasWrapperRef.current) return

      const wrapperRect = canvasWrapperRef.current.getBoundingClientRect()
      const x = e.clientX - wrapperRect.left
      const y = e.clientY - wrapperRect.top

      // 클릭 좌표의 fabric 객체 확인
      const fabricCanvas = canvas._fabricCanvas
      const canvasEl = fabricCanvas.getElement()
      const canvasRect = canvasEl.getBoundingClientRect()
      const fx = e.clientX - canvasRect.left
      const fy = e.clientY - canvasRect.top
      const target = fabricCanvas.findTarget(new MouseEvent('click', { clientX: fx, clientY: fy }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetId = (target as any)?.data?.id ?? null

      setMenu({ x, y, open: true, targetId })
    },
    [canvas, canvasWrapperRef],
  )

  // 외부에서 openMenu 를 호출할 수 있도록 ref 로 노출
  // → EditorCanvas 의 onContextMenu 핸들러에서 직접 호출
  useEffect(() => {
    const wrapper = canvasWrapperRef.current
    if (!wrapper) return
    wrapper.addEventListener('contextmenu', openMenu)
    return () => wrapper.removeEventListener('contextmenu', openMenu)
  }, [canvasWrapperRef, openMenu])

  const close = useCallback(() => {
    setMenu((prev) => ({ ...prev, open: false }))
  }, [])

  // ── 대상 객체 정보 ────────────────────────────────────────────────────────

  const targetId = menu.targetId
  const isObjectMenu = Boolean(targetId)
  const node = targetId ? layerTree?.getNode(targetId) : null
  const isLocked = node?.locked ?? false
  const isHidden = node?.hidden ?? false

  // ── 핸들러: 빈 공간 ──────────────────────────────────────────────────────

  const handleSelectAll = useCallback(() => {
    if (!canvas) return
    const fabricCanvas = canvas._fabricCanvas
    const objs = fabricCanvas.getObjects()
    if (objs.length === 0) return
    fabricCanvas.discardActiveObject()
    if (objs.length === 1 && objs[0]) {
      fabricCanvas.setActiveObject(objs[0])
    } else {
      const selection = new ActiveSelection(objs, { canvas: fabricCanvas })
      fabricCanvas.setActiveObject(selection)
    }
    fabricCanvas.requestRenderAll()
    close()
  }, [canvas, close])

  const handleZoomIn = useCallback(() => {
    if (!canvas) return
    const curr = getZoomPercent(canvas)
    applyZoom(canvas, Math.min(MAX_ZOOM, curr + 10))
    close()
  }, [canvas, close])

  const handleZoomOut = useCallback(() => {
    if (!canvas) return
    const curr = getZoomPercent(canvas)
    applyZoom(canvas, Math.max(MIN_ZOOM, curr - 10))
    close()
  }, [canvas, close])

  const handleZoom100 = useCallback(() => {
    if (!canvas) return
    applyZoom(canvas, 100)
    close()
  }, [canvas, close])

  const handleFit = useCallback(() => {
    if (!canvas) return
    fitToViewport(canvas)
    close()
  }, [canvas, close])

  // ── 핸들러: 객체 ─────────────────────────────────────────────────────────

  const handleDuplicate = useCallback(async () => {
    if (!canvas || !history || !targetId) return
    close()
    const fabricObj = canvas.getObject(targetId) as FabricObject | null
    if (!fabricObj) return
    try {
      const cloned = await fabricObj.clone()
      cloned.set({
        left: (fabricObj.left ?? 0) + 16,
        top: (fabricObj.top ?? 0) + 16,
      })
      const data = canvas.getObjectData(targetId)
      const cmd = new AddObjectCommand({
        canvas,
        fabricObj: cloned,
        dataOverrides: { kind: data?.kind ?? 'prop' },
      })
      history.push(cmd)
      showToast('복제됨', 'success')
    } catch (err) {
      console.error('[CanvasContextMenu] 복제 실패:', err)
      showToast('복제에 실패했습니다.', 'error')
    }
  }, [canvas, history, targetId, close])

  const handleLockToggle = useCallback(() => {
    if (!canvas || !history || !layerTree || !targetId) return
    const prevStates = collectLockPrevStates(layerTree, targetId, false)
    const cmd = new LockCommand({ layerTree, id: targetId, locked: !isLocked, prevStates })
    history.push(cmd)
    close()
  }, [canvas, history, layerTree, targetId, isLocked, close])

  const handleHiddenToggle = useCallback(() => {
    if (!canvas || !history || !layerTree || !targetId) return
    const prevStates = collectHiddenPrevStates(layerTree, targetId, false)
    const cmd = new HiddenCommand({ layerTree, id: targetId, hidden: !isHidden, prevStates })
    history.push(cmd)
    close()
  }, [canvas, history, layerTree, targetId, isHidden, close])

  const handleZOrder = useCallback(
    (action: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack') => {
      if (!canvas || !history || !layerTree || !targetId) return
      const parentId = layerTree.getNode(targetId)?.parentId ?? null
      const siblings = parentId
        ? (layerTree.getNode(parentId)?.childrenIds ?? [])
        : layerTree.getRootNodes().map((n) => n.id)
      const cmd = new ZOrderCommand({
        layerTree,
        id: targetId,
        action,
        siblingsBefore: siblings,
        parentId,
      })
      history.push(cmd)
      close()
    },
    [canvas, history, layerTree, targetId, close],
  )

  const handleDelete = useCallback(() => {
    if (!canvas || !history || !targetId) return
    close()
    const fabricObj = canvas.getObject(targetId)
    const objectData = canvas.getObjectData(targetId)
    if (!fabricObj || !objectData) return
    canvas._fabricCanvas.discardActiveObject()
    const cmd = new RemoveObjectCommand({ canvas, id: targetId, fabricObj, objectData })
    history.push(cmd)
  }, [canvas, history, targetId, close])

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <DropdownMenu
      open={menu.open}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      {/* 1×1 invisible trigger — 클릭 좌표에 배치 */}
      <DropdownMenuTrigger asChild>
        <div
          ref={triggerRef}
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: menu.x,
            top: menu.y,
            width: 1,
            height: 1,
          }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        align="start"
        side="bottom"
        // sideOffset 0 — trigger 가 1px 이므로 클릭 좌표에서 시작
        sideOffset={0}
        className="z-[50]"
      >
        {isObjectMenu ? (
          // ── 객체 우클릭 메뉴 ──────────────────────────────────────────────
          <>
            <DropdownMenuItem onSelect={handleDuplicate}>
              복제
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLockToggle}>
              {isLocked ? '잠금 해제' : '잠금'}
              <DropdownMenuShortcut>⌘L</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleHiddenToggle}>
              {isHidden ? '표시' : '숨김'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleZOrder('bringToFront')}>
              맨 앞으로
              <DropdownMenuShortcut>⌘]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleZOrder('bringForward')}>
              한 칸 앞으로
              <DropdownMenuShortcut>]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleZOrder('sendBackward')}>
              한 칸 뒤로
              <DropdownMenuShortcut>[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleZOrder('sendToBack')}>
              맨 뒤로
              <DropdownMenuShortcut>⌘[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleDelete}
              className="text-[var(--color-status-error)] focus:text-[var(--color-status-error)]"
            >
              삭제
              <DropdownMenuShortcut>Del</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          // ── 빈 공간 우클릭 메뉴 ──────────────────────────────────────────
          <>
            <DropdownMenuItem disabled>
              붙여넣기
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSelectAll}>
              전체 선택
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleZoomIn}>확대</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleZoomOut}>축소</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleZoom100}>100%</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleFit}>
              페이지 맞춤
              <DropdownMenuShortcut>F</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
