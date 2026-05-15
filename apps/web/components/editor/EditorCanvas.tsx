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
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ResourceSummary } from '../../app/api/_lib/search-types'

import { CanvasContextMenu } from './CanvasContextMenu'
import { EmptyCanvasHint } from './EmptyCanvasHint'
import { FloatingObjectBar } from './FloatingObjectBar'
import { applyZoom, fitToViewport, getZoomPercent, MAX_ZOOM, MIN_ZOOM } from './Footer'
import { useImageDrop } from './hooks/useImageDrop'
import type { PoseDragPayload } from './panels/PoseGridItem'
import { POSE_DRAG_MIME } from './panels/PoseGridItem'
import { useToolStore } from './store/useToolStore'
import type { HistoryRef as History } from './types'

// ─────────────────────────────────────────────
// B.3: 페이지 경계 오버레이 훅
// fabric의 viewportTransform 에서 페이지의 실제 화면 위치/크기를 계산하여
// CSS 박스를 오버레이로 표시한다 (흰 배경 + 그림자 + 경계).
// ─────────────────────────────────────────────
function usePageOverlay(canvas: StoryCanvas | null) {
  const [pageBox, setPageBox] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    if (!canvas) {
      setPageBox(null)
      return
    }

    const fc = canvas._fabricCanvas

    const updateBox = () => {
      const zoom = fc.getZoom()
      const vt = fc.viewportTransform
      const format = canvas.format
      const pageW = canvas.mmToPx(format.widthMm)
      const pageH = canvas.mmToPx(format.heightMm)

      // viewportTransform: [scaleX, 0, 0, scaleY, offsetX, offsetY]
      const offsetX = vt[4] ?? 0
      const offsetY = vt[5] ?? 0

      setPageBox({
        left: offsetX,
        top: offsetY,
        width: pageW * zoom,
        height: pageH * zoom,
      })
    }

    fc.on('after:render', updateBox)
    updateBox()

    return () => {
      fc.off('after:render', updateBox)
    }
  }, [canvas])

  return pageBox
}

// ─────────────────────────────────────────────
// C-1: ResizeObserver 3중 가드 (BUG-013 — iOS 크래시 차단)
//
// 핵심 설계 원칙:
//   - fabric canvas 내부 좌표계 = 뷰포트 크기 (setDimensions 로 동적 조정)
//   - 객체/슬롯 좌표 = 페이지 px (canvas.format 기준, 예: 1772px)
//   - viewportTransform 으로 1772px 페이지를 뷰포트(800px) 중앙에 fit (fitToViewport)
//
// 핵심 수정 사항:
//   - 크기 변경 시 항상 fitToViewport 호출 (기존: 최초만)
//   - 1px 미만 변동 무시: 폰트 스케일링/서브픽셀 루프 차단
//   - RAF 배칭: 한 프레임에 알림이 복수여도 resize() 는 1번만
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
      // 가드: fabric 내부 컨텍스트가 살아있는지 확인
      if (!canvas || !(canvas._fabricCanvas as { getContext?: () => unknown }).getContext?.())
        return
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w <= 0 || h <= 0) return
      // 1px 미만 변동 무시: 서브픽셀 루프 차단
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      lastW = w
      lastH = h

      // fabric canvas 내부 크기 = 뷰포트 크기로 업데이트
      canvas._fabricCanvas.setDimensions({ width: w, height: h })

      // 항상 fitToViewport 실행: 크기 변경 시마다 viewportTransform 재계산
      // (기존 버그: isFirstResize 이후엔 fitToViewport 미호출 → 슬롯/객체 좌표 불일치)
      void import('./Footer').then(({ fitToViewport }) => {
        fitToViewport(canvas)
      })
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
  /** PosePanel 드래그앤드롭 → 캔버스 추가 콜백 */
  onAddPoseToCanvas?: (pose: ResourceSummary) => void
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
  onAddPoseToCanvas,
}: EditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  // C-1: ResizeObserver 3중 가드 적용
  useResizeObserverGuard(wrapRef, canvas)

  // B.3: 페이지 경계 오버레이
  const pageBox = usePageOverlay(canvas)

  // 포즈 도구 활성화 (EmptyCanvasHint 칩에서 호출)
  const { setActive } = useToolStore()
  const handleActivatePoseTool = useCallback(() => {
    setActive('pose')
  }, [setActive])

  // 이미지 드래그앤드롭 (파일 기반)
  const {
    isDragging,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop: onImageDrop,
  } = useImageDrop({
    canvas,
    history,
  })

  // 포즈 패널 드래그앤드롭 처리 (application/x-storywork-pose MIME)
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const poseJson = e.dataTransfer.getData(POSE_DRAG_MIME)
      if (poseJson) {
        e.preventDefault()
        e.stopPropagation()
        try {
          const payload = JSON.parse(poseJson) as PoseDragPayload
          // ResourceSummary 형태로 변환하여 addPoseFromResource 호출
          const pose: ResourceSummary = {
            id: payload.id,
            slug: payload.slug,
            thumbUrl: payload.fileUrl,
            width: null,
            height: null,
            masterDpi: payload.masterDpi,
            lowDpi: payload.lowDpi,
            meta: payload.meta,
            tags: [],
          }
          if (onAddPoseToCanvas) {
            onAddPoseToCanvas(pose)
          }
        } catch {
          console.error('[EditorCanvas] 포즈 드롭 파싱 실패')
        }
        return
      }
      // 일반 이미지 파일 드롭
      onImageDrop(e)
    },
    [onImageDrop, onAddPoseToCanvas],
  )

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
        // B.3: 전체 workspace 를 회색으로 (페이지 경계 인지)
        'relative flex flex-1 overflow-hidden',
        'bg-[var(--editor-workspace-bg,#e5e7eb)]',
        // 포커스 링
        'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-500)]',
        // 드래그 활성 시 보라색 dashed outline
        isDragging && 'ring-2 ring-inset ring-[var(--color-brand-500)] ring-dashed',
      )}
    >
      {/* fabric 캔버스 마운트 포인트 — workspace 외곽 padding 으로 회색 여백 노출 */}
      <div
        ref={containerRef}
        aria-label="fabric 캔버스 마운트"
        className="absolute inset-4 md:inset-6 lg:inset-8"
      />

      {/* B.3: 페이지 경계 오버레이 (pointer-events-none — 클릭 투과) */}
      {pageBox && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: pageBox.left,
            top: pageBox.top,
            width: pageBox.width,
            height: pageBox.height,
            // 페이지 영역 외부 경계 강조 (그림자 + 실선 테두리)
            boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
            // 페이지 배경은 fabric 이 그리므로 overlay 는 transparent
          }}
        />
      )}

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
