'use client'

// ─────────────────────────────────────────────
// EditorCanvas — StoryCanvas 마운트 + 키보드 단축키
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { History } from '@storywork/editor-history'
import { RemoveObjectCommand } from '@storywork/editor-history'
import { cn } from '@storywork/ui'
import { useCallback, useEffect, useRef } from 'react'

type EditorCanvasProps = {
  /** StoryCanvas 의 마운트 포인트 */
  containerRef: React.RefObject<HTMLDivElement | null>
  canvas: StoryCanvas | null
  history: History | null
  /** 선택된 객체 ids (키보드 삭제에 사용) */
  selectedIds: string[]
  onClearSelection: () => void
}

/**
 * EditorCanvas
 *
 * - containerRef 를 div 에 바인딩 (StoryCanvas 는 useStoryCanvas 에서 마운트)
 * - 캔버스 영역 클릭 포커스 + 키보드 단축키 위임
 *   - Esc: 선택 해제
 *   - Delete/Backspace: 선택 삭제 (RemoveObjectCommand → history)
 *   - Arrow: 1mm 이동 / Shift+Arrow: 10mm 이동
 *   - F: 전체 보기 (fit to viewport — 향후 구현, 현재 no-op)
 */
export function EditorCanvas({
  containerRef,
  canvas,
  history,
  selectedIds,
  onClearSelection,
}: EditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canvas) return

      // Esc — 선택 해제
      if (e.key === 'Escape') {
        e.preventDefault()
        onClearSelection()
        return
      }

      // Delete / Backspace — 선택 삭제
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        canvas._fabricCanvas.discardActiveObject()
        for (const id of selectedIds) {
          const fabricObj = canvas.getObject(id)
          const data = canvas.getObjectData(id)
          if (!fabricObj || !data) continue
          if (history) {
            const cmd = new RemoveObjectCommand({ canvas, id, fabricObj, objectData: data })
            history.push(cmd)
          } else {
            canvas.removeObject(id)
          }
        }
        return
      }

      // Arrow 키 — 이동 (mm 단위)
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      if (isArrow && selectedIds.length > 0) {
        e.preventDefault()
        const deltaMm = e.shiftKey ? 10 : 1
        for (const id of selectedIds) {
          const obj = canvas.getObject(id)
          if (!obj) continue
          const deltaPx = canvas.mmToPx(deltaMm)
          const left = obj.left ?? 0
          const top = obj.top ?? 0
          if (e.key === 'ArrowLeft') obj.set({ left: left - deltaPx })
          if (e.key === 'ArrowRight') obj.set({ left: left + deltaPx })
          if (e.key === 'ArrowUp') obj.set({ top: top - deltaPx })
          if (e.key === 'ArrowDown') obj.set({ top: top + deltaPx })
          obj.setCoords()
        }
        canvas._fabricCanvas.requestRenderAll()
        // transform 완료 시 history push (object:modified 를 수동 fire)
        if (selectedIds.length === 1) {
          const firstId = selectedIds[0]
          if (firstId) {
            const obj = canvas.getObject(firstId)
            if (obj) canvas._fabricCanvas.fire('object:modified', { target: obj })
          }
        }
        return
      }

      // F — 전체 보기 (M1-07 에서 구현 예정)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        // TODO M1-07: fit to viewport
      }
    },
    [canvas, history, selectedIds, onClearSelection],
  )

  // 캔버스 내부 클릭 시 wrapper 에 포커스 이동 (키보드 이벤트 수신)
  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const onClick = () => wrapper.focus()
    wrapper.addEventListener('click', onClick)
    return () => wrapper.removeEventListener('click', onClick)
  }, [])

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="편집 캔버스"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-1 items-center justify-center overflow-auto',
        'bg-[var(--color-surface-muted)]',
        // 포커스 링
        'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
      )}
    >
      {/* 흰색 페이지 + 그림자 */}
      <div
        className="relative"
        style={{
          // 캔버스는 fabric 이 내부적으로 크기를 결정. 외부 컨테이너를 맞춘다.
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12)',
        }}
      >
        <div ref={containerRef} aria-label="fabric 캔버스 마운트" />
      </div>
    </div>
  )
}
