'use client'

// ─────────────────────────────────────────────
// EditorCanvas — StoryCanvas 마운트 + 키보드 단축키 + 드래그앤드롭
//
// M1-08e 추가:
//   - EmptyCanvasHint: 사용자 객체 0개 시 가이드 오버레이
//   - useImageDrop: 이미지 파일 드래그앤드롭
//   - FloatingObjectBar: 선택 객체 위 액션 바
//   - CanvasContextMenu: 우클릭 컨텍스트 메뉴
//   - 줌 키보드 단축키: Cmd+= / Cmd+− / Cmd+0 / F
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { RemoveObjectCommand } from '@storywork/editor-history'
import type { LayerTree } from '@storywork/editor-layers'
import { cn } from '@storywork/ui'
import { useCallback, useEffect, useRef } from 'react'

import { CanvasContextMenu } from './CanvasContextMenu'
import { EmptyCanvasHint } from './EmptyCanvasHint'
import { FloatingObjectBar } from './FloatingObjectBar'
import { applyZoom, fitToViewport, getZoomPercent, MAX_ZOOM, MIN_ZOOM } from './Footer'
import { useImageDrop } from './hooks/useImageDrop'
import { useToolStore } from './store/useToolStore'
import type { HistoryRef as History } from './types'

// ─────────────────────────────────────────────
// C-1: ResizeObserver 3중 가드 (BUG-013 — iOS 크래시 차단)
// 1) RAF 배칭: 한 프레임에 ResizeObserver 알림이 복수여도 resize() 는 1번만
// 2) 1px 미만 변동 무시: 폰트 스케일링/서브픽셀 정밀도에 의한 루프 차단
// 3) 동일 크기 setDimensions skip: fabric 불필요 재렌더 방지
// ─────────────────────────────────────────────
function useResizeObserverGuard(
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  canvas: StoryCanvas | null,
) {
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !canvas) return

    let lastW = 0
    let lastH = 0
    let rafId: number | null = null

    const resize = () => {
      rafId = null
      // 가드 3: fabric 내부 컨텍스트가 살아있는지 확인
      if (!canvas || !(canvas._fabricCanvas as { getContext?: () => unknown }).getContext?.())
        return
      const w = el.offsetWidth
      const h = el.offsetHeight
      // 가드 1: 1px 미만 변동 무시
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      // 가드 2: 이미 동일 크기면 setDimensions skip
      if (canvas._fabricCanvas.getWidth() === w && canvas._fabricCanvas.getHeight() === h) return
      lastW = w
      lastH = h
      canvas._fabricCanvas.setDimensions({ width: w, height: h })
      canvas._fabricCanvas.requestRenderAll()
    }

    const ro = new ResizeObserver(() => {
      // RAF 배칭: 이미 예약된 RAF 가 있으면 중복 등록 안 함
      if (rafId !== null) return
      rafId = requestAnimationFrame(resize)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [canvas, wrapperRef])
}

type EditorCanvasProps = {
  /** StoryCanvas 의 마운트 포인트 */
  containerRef: React.RefObject<HTMLDivElement | null>
  canvas: StoryCanvas | null
  history: History | null
  layerTree: LayerTree | null
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
 *   - F: 전체 보기 (fit to viewport)
 *   - Cmd+= / Cmd+−: 줌인/아웃
 *   - Cmd+0: 100% 줌
 * - EmptyCanvasHint: 사용자 객체 없을 때 오버레이
 * - useImageDrop: 이미지 파일 드래그앤드롭
 * - FloatingObjectBar: 선택 객체 위 액션 바
 * - CanvasContextMenu: 우클릭 메뉴
 */
export function EditorCanvas({
  containerRef,
  canvas,
  history,
  layerTree,
  selectedIds,
  onClearSelection,
}: EditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  // C-1: ResizeObserver 3중 가드 적용
  useResizeObserverGuard(wrapRef, canvas)

  // 포즈 도구 활성화 (EmptyCanvasHint 칩에서 호출)
  const { setActive } = useToolStore()
  const handleActivatePoseTool = useCallback(() => {
    setActive('pose')
  }, [setActive])

  // 이미지 드래그앤드롭
  const { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop } = useImageDrop({
    canvas,
    history,
  })

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canvas) return

      const isCmd = e.metaKey || e.ctrlKey

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

      // F — 페이지 맞춤 (fit to viewport)
      if ((e.key === 'f' || e.key === 'F') && !isCmd) {
        e.preventDefault()
        fitToViewport(canvas)
        return
      }

      // Cmd/Ctrl + = / + — 줌인
      if (isCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const curr = getZoomPercent(canvas)
        applyZoom(canvas, Math.min(MAX_ZOOM, curr + 10))
        return
      }

      // Cmd/Ctrl + - / − — 줌아웃
      if (isCmd && e.key === '-') {
        e.preventDefault()
        const curr = getZoomPercent(canvas)
        applyZoom(canvas, Math.max(MIN_ZOOM, curr - 10))
        return
      }

      // Cmd/Ctrl + 0 — 100% 줌
      if (isCmd && e.key === '0') {
        e.preventDefault()
        applyZoom(canvas, 100)
        return
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

  // 휠 줌 (Overlay 깜빡임 방지를 위해 passive:false 사용)
  useEffect(() => {
    const wrapper = wrapRef.current
    if (!wrapper) return

    const onWheel = (e: WheelEvent) => {
      if (!canvas || !e.ctrlKey) return
      e.preventDefault()
      const curr = getZoomPercent(canvas)
      const delta = e.deltaY > 0 ? -5 : 5
      applyZoom(canvas, Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, curr + delta)))
    }

    wrapper.addEventListener('wheel', onWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', onWheel)
  }, [canvas])

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="편집 캔버스"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'relative flex flex-1 items-center justify-center overflow-auto',
        'bg-[var(--color-surface-muted)]',
        // 포커스 링
        'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
        // 드래그 활성 시 보라색 dashed outline
        isDragging && 'ring-2 ring-inset ring-[var(--color-brand-500)] ring-dashed',
      )}
    >
      {/* 드래그 활성 시 중앙 뱃지 */}
      {isDragging && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none absolute inset-0 z-[30]',
            'flex items-center justify-center',
          )}
        >
          <div
            className={cn(
              'rounded-xl border-2 border-dashed border-[var(--color-brand-500)]',
              'bg-[var(--color-brand-500)]/10 px-8 py-5',
              'text-sm font-semibold text-[var(--color-brand-500)]',
            )}
          >
            이미지를 놓으면 캔버스에 추가됩니다
          </div>
        </div>
      )}

      {/* 빈 캔버스 힌트 */}
      <EmptyCanvasHint canvas={canvas} onActivatePoseTool={handleActivatePoseTool} />

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

      {/* 선택 객체 위 Floating 액션 바 */}
      {selectedIds.length > 0 && (
        <FloatingObjectBar
          canvas={canvas}
          history={history}
          layerTree={layerTree}
          selectedIds={selectedIds}
          canvasWrapperRef={wrapRef}
        />
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      <CanvasContextMenu
        canvas={canvas}
        history={history}
        layerTree={layerTree}
        canvasWrapperRef={wrapRef}
      />
    </div>
  )
}
